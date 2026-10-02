const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const KhataTransaction = require('../models/KhataTransaction');

let memorySales = [];

// Helper to generate Invoice Number
const generateInvoiceNo = () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SUP-${dateStr}-${rand}`;
};

// GET Sales list & Analytics
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    let sales;
    try {
      sales = await Sale.find().sort({ createdAt: -1 }).limit(Number(limit));
    } catch (e) {
      sales = memorySales.slice(0, Number(limit));
    }
    res.json({ success: true, count: sales.length, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Sales Summary Stats (Today Revenue, Total Debt, Sales Count)
router.get('/summary', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let sales;
    try {
      sales = await Sale.find({ createdAt: { $gte: startOfDay } });
    } catch (e) {
      sales = memorySales.filter(s => new Date(s.createdAt) >= startOfDay);
    }

    const todayRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const todayOrders = sales.length;

    let customers = [];
    try {
      customers = await Customer.find();
    } catch (e) {}

    const totalUdharDebt = customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);

    res.json({
      success: true,
      data: {
        todayRevenue,
        todayOrders,
        totalUdharDebt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Create Sale / Billing POS Checkout
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, items, subtotal, discount, tax, totalAmount, paymentMode, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
    }

    const invoiceNo = generateInvoiceNo();
    const isUdhar = paymentMode === 'UDHAR';

    let savedSale;
    let whatsAppNoticeData = null;
    let customerObj = null;

    // 1. Process Stock Deduction
    for (const item of items) {
      try {
        if (item.productId) {
          const prod = await Product.findById(item.productId);
          if (prod) {
            prod.stockQty = Math.max(0, prod.stockQty - item.quantity);
            await prod.save();
          }
        }
      } catch (e) {}
    }

    // 2. Update Customer records (Total Purchases & Udhar Balance if applicable)
    if (customerId) {
      try {
        customerObj = await Customer.findById(customerId);
        if (customerObj) {
          customerObj.totalPurchases = (customerObj.totalPurchases || 0) + totalAmount;

          if (isUdhar) {
            const prevBal = customerObj.creditBalance || 0;
            const newBal = prevBal + totalAmount;

            customerObj.creditBalance = newBal;
            await customerObj.save();

            // Create Khata Ledger entry
            const khataEntry = await KhataTransaction.create({
              customerId: customerObj._id.toString(),
              customerName: customerObj.name,
              customerPhone: customerObj.phone,
              saleId: null,
              invoiceNo,
              itemsSummary: items.map(i => ({
                name: i.name,
                quantity: i.quantity,
                unit: i.unit || 'pcs',
                price: i.price,
                total: i.total || i.price * i.quantity
              })),
              type: 'CREDIT_PURCHASE',
              amount: totalAmount,
              previousBalance: prevBal,
              newBalance: newBal,
              paymentMethod: 'UDHAR',
              notes: `POS Bill #${invoiceNo}`
            });

            // Build WhatsApp Notification payload
            const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const itemsText = items.map(i => `• ${i.name} (${i.quantity} ${i.unit || 'pcs'}) = ₹${i.total || i.price * i.quantity}`).join('\n');
            const cleanPhone = (customerObj.phone || customerPhone).replace(/\D/g, '');

            const rawMessage = `🛍️ *SUPERMART - Udhar Bill Notice*
----------------------------------
👤 Customer: *${customerObj.name}* ${customerObj.fatherName ? `(S/O ${customerObj.fatherName})` : ''}
📅 Date: ${dateStr}
🧾 Invoice: *#${invoiceNo}*

🛒 *Items Purchased on Credit:*
${itemsText}
----------------------------------
💵 Today's Udhar: *₹${totalAmount.toLocaleString('en-IN')}*
📈 Previous Udhar Balance: ₹${prevBal.toLocaleString('en-IN')}
💳 *Total Pending Udhar: ₹${newBal.toLocaleString('en-IN')}*

🙏 Please clear at your convenience via UPI/Cash. Thank you!`;

            const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(rawMessage)}`;

            whatsAppNoticeData = {
              rawMessage,
              waUrl,
              cleanPhone,
              previousBalance: prevBal,
              newBalance: newBal,
              todayAmount: totalAmount
            };
          } else {
            await customerObj.save();
          }
        }
      } catch (e) {
        console.error('Udhar/Customer save error:', e);
      }
    }

    // 3. Save Sale record
    try {
      savedSale = await Sale.create({
        invoiceNo,
        customerId: customerId || null,
        customerName: customerName || (customerObj ? customerObj.name : 'Walk-in Customer'),
        customerPhone: customerPhone || (customerObj ? customerObj.phone : ''),
        items,
        subtotal: Number(subtotal),
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        totalAmount: Number(totalAmount),
        paymentMode,
        paymentStatus: isUdhar ? 'PENDING_UDHAR' : 'PAID',
        notes: notes || ''
      });
    } catch (e) {
      savedSale = {
        _id: 'sale_' + Date.now(),
        invoiceNo,
        customerId: customerId || null,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        items,
        subtotal: Number(subtotal),
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        totalAmount: Number(totalAmount),
        paymentMode,
        paymentStatus: isUdhar ? 'PENDING_UDHAR' : 'PAID',
        createdAt: new Date()
      };
      memorySales.unshift(savedSale);
    }

    res.status(201).json({
      success: true,
      message: 'Sale finalized successfully',
      data: savedSale,
      whatsAppNotice: whatsAppNoticeData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
