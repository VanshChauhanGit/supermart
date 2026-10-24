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

const OnlineOrder = require('../models/OnlineOrder');

// Helper to determine delivery date for an online order
const getDeliveredDate = (order) => {
  return order.statusTimestamps?.deliveredAt 
    || order.updatedAt 
    || order.createdAt 
    || new Date();
};

// GET Sales list & Analytics (combines POS sales and delivered online orders)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    let sales = [];
    let deliveredOrders = [];

    try {
      sales = await Sale.find().sort({ createdAt: -1 }).limit(Number(limit));
    } catch (e) {
      sales = memorySales.slice(0, Number(limit));
    }

    try {
      deliveredOrders = await OnlineOrder.find({ status: 'DELIVERED' })
        .sort({ 'statusTimestamps.deliveredAt': -1, updatedAt: -1 })
        .limit(Number(limit));
    } catch (e) {
      const orderRoutes = require('./orders');
      const memOrders = orderRoutes.memoryOrders || [];
      deliveredOrders = memOrders.filter(o => o.status === 'DELIVERED');
    }

    // Format delivered online orders as sale records
    const formattedOrders = deliveredOrders.map(o => ({
      _id: o._id,
      invoiceNo: o.orderNo || `ORD-${o._id}`,
      customerId: null,
      customerName: o.customerName || 'Online Customer',
      customerPhone: o.phone || '',
      items: (o.items || []).map(i => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        unit: i.unit || 'pcs',
        total: i.total || (i.price * i.quantity)
      })),
      subtotal: o.subtotal || o.totalAmount,
      discount: o.discountAmount || 0,
      tax: 0,
      totalAmount: o.totalAmount || 0,
      paymentMode: o.paymentMethod === 'ONLINE_UPI' ? 'UPI' : 'CASH',
      paymentStatus: 'PAID',
      notes: `Online Order Delivered (${o.paymentMethod || 'COD'})`,
      isOnlineOrder: true,
      createdAt: getDeliveredDate(o)
    }));

    // Merge and sort newest first
    const combined = [...sales, ...formattedOrders].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, Number(limit));

    res.json({ success: true, count: combined.length, data: combined });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Sales Summary Stats (Today, Week, Month Revenue, Total Debt, Payment Breakdown)
// Incorporates both in-store POS sales AND delivered Online Orders
router.get('/summary', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);
    startOfMonth.setHours(0, 0, 0, 0);

    let todaySales = [];
    let weekSales = [];
    let monthSales = [];
    try {
      todaySales = await Sale.find({ createdAt: { $gte: startOfDay } });
      weekSales = await Sale.find({ createdAt: { $gte: startOfWeek } });
      monthSales = await Sale.find({ createdAt: { $gte: startOfMonth } });
    } catch (e) {
      todaySales = memorySales.filter(s => new Date(s.createdAt) >= startOfDay);
      weekSales = memorySales.filter(s => new Date(s.createdAt) >= startOfWeek);
      monthSales = memorySales.filter(s => new Date(s.createdAt) >= startOfMonth);
    }

    // Query delivered online orders
    let allDeliveredOrders = [];
    try {
      allDeliveredOrders = await OnlineOrder.find({ status: 'DELIVERED' });
    } catch (e) {
      const orderRoutes = require('./orders');
      const memOrders = orderRoutes.memoryOrders || [];
      allDeliveredOrders = memOrders.filter(o => o.status === 'DELIVERED');
    }

    const todayDeliveredOrders = allDeliveredOrders.filter(o => {
      const d = new Date(getDeliveredDate(o));
      return d >= startOfDay;
    });

    const weekDeliveredOrders = allDeliveredOrders.filter(o => {
      const d = new Date(getDeliveredDate(o));
      return d >= startOfWeek;
    });

    const monthDeliveredOrders = allDeliveredOrders.filter(o => {
      const d = new Date(getDeliveredDate(o));
      return d >= startOfMonth;
    });

    // POS Revenue totals
    const posTodayRevenue = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const posWeekRevenue = weekSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const posMonthRevenue = monthSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    // Online Delivered Revenue totals
    const onlineTodayRevenue = todayDeliveredOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const onlineWeekRevenue = weekDeliveredOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const onlineMonthRevenue = monthDeliveredOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    // Combined Revenue and Order Counts
    const todayRevenue = posTodayRevenue + onlineTodayRevenue;
    const weekRevenue = posWeekRevenue + onlineWeekRevenue;
    const monthRevenue = posMonthRevenue + onlineMonthRevenue;
    const todayOrders = todaySales.length + todayDeliveredOrders.length;

    // Payment breakdowns (COD counts towards CASH, ONLINE_UPI towards UPI)
    const onlineCashToday = todayDeliveredOrders
      .filter(o => o.paymentMethod === 'COD' || !o.paymentMethod)
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    const onlineUpiToday = todayDeliveredOrders
      .filter(o => o.paymentMethod === 'ONLINE_UPI')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    const paymentBreakdown = {
      CASH: todaySales.filter(s => s.paymentMode === 'CASH').reduce((acc, s) => acc + (s.totalAmount || 0), 0) + onlineCashToday,
      UPI: todaySales.filter(s => s.paymentMode === 'UPI').reduce((acc, s) => acc + (s.totalAmount || 0), 0) + onlineUpiToday,
      UDHAR: todaySales.filter(s => s.paymentMode === 'UDHAR').reduce((acc, s) => acc + (s.totalAmount || 0), 0)
    };

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
        weekRevenue,
        monthRevenue,
        paymentBreakdown,
        totalUdharDebt,
        onlineTodayRevenue,
        posTodayRevenue,
        onlineDeliveredCount: todayDeliveredOrders.length,
        posSalesCount: todaySales.length
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
