const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const KhataTransaction = require('../models/KhataTransaction');
const { initialCustomers } = require('../config/seedData');

// Memory storage fallback
let memoryCustomers = [...initialCustomers.map((c, idx) => ({ ...c, _id: `cust_${idx + 1}`, createdAt: new Date() }))];
let memoryTransactions = [
  {
    _id: 'tx_1',
    customerId: 'cust_1',
    customerName: 'Rajesh Kumar',
    customerPhone: '9876543210',
    type: 'CREDIT_PURCHASE',
    amount: 1850,
    previousBalance: 0,
    newBalance: 1850,
    itemsSummary: [
      { name: 'Aashirvaad Atta 5kg', quantity: 1, unit: 'pcs', price: 235, total: 235 },
      { name: 'Fortune Sunflower Oil 1L', quantity: 2, unit: 'ltr', price: 148, total: 296 },
      { name: 'Red Label Tea 500g', quantity: 1, unit: 'pcs', price: 260, total: 260 },
      { name: 'Surf Excel Detergent 1kg', quantity: 8, unit: 'kg', price: 132, total: 1056 }
    ],
    notes: 'Bill #SUP-9042',
    createdAt: new Date(Date.now() - 86400000 * 2)
  }
];

// Seed Customers if empty
const seedCustomers = async () => {
  try {
    const count = await Customer.countDocuments();
    if (count === 0) {
      await Customer.insertMany(initialCustomers);
      console.log('[Seed] MongoDB Customers collection populated.');
    }
  } catch (e) {}
};
seedCustomers();

// Helper to construct WhatsApp Udhar formatted notice
const buildWhatsAppNotice = (customerName, customerPhone, items, todayUdharAmount, prevBalance, newBalance, invoiceNo = '') => {
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  let itemsListText = '';
  if (items && items.length > 0) {
    itemsListText = items.map(item => `• ${item.name} (${item.quantity} ${item.unit || 'pcs'}) = ₹${item.total || (item.price * item.quantity)}`).join('\n');
  } else {
    itemsListText = `• Store Purchase (Bill #${invoiceNo || 'DIRECT'})`;
  }

  const rawMessage = `🛍️ *SUPERMART - Udhar Bill Notice*
----------------------------------
👤 Customer: *${customerName}*
📅 Date: ${dateStr}
${invoiceNo ? `🧾 Invoice: #${invoiceNo}\n` : ''}
🛒 *Items Purchased on Credit:*
${itemsListText}
----------------------------------
💵 Today's Udhar: ₹${todayUdharAmount.toLocaleString('en-IN')}
📈 Previous Udhar Balance: ₹${prevBalance.toLocaleString('en-IN')}
💳 *Total Pending Udhar: ₹${newBalance.toLocaleString('en-IN')}*

🙏 Please review and clear at your convenience via UPI/Cash. Thank you for shopping with Supermart!`;

  const encodedMessage = encodeURIComponent(rawMessage);
  const waUrl = `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;

  return {
    rawMessage,
    waUrl,
    cleanPhone
  };
};

// GET all customers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let customers;
    try {
      let query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { fatherName: { $regex: search, $options: 'i' } }
        ];
      }
      customers = await Customer.find(query).sort({ creditBalance: -1 });
    } catch (e) {
      customers = memoryCustomers.filter(c => {
        if (search) {
          const s = search.toLowerCase();
          return c.name.toLowerCase().includes(s) || c.phone.toLowerCase().includes(s) || (c.fatherName && c.fatherName.toLowerCase().includes(s));
        }
        return true;
      });
    }
    res.json({ success: true, count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});






// GET single customer by ID + transaction history
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let customer, transactions;
    try {
      customer = await Customer.findById(id);
      transactions = await KhataTransaction.find({ customerId: id }).sort({ createdAt: -1 });
    } catch (e) {
      customer = memoryCustomers.find(c => c._id === id);
      transactions = memoryTransactions.filter(t => t.customerId === id);
    }
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: { customer, transactions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Create new customer profile
router.post('/', async (req, res) => {
  try {
    const { name, fatherName, phone, address, creditLimit, notes } = req.body;
    let customer;
    try {
      customer = await Customer.create({
        name,
        fatherName: fatherName || '',
        phone,
        address: address || '',
        creditLimit: Number(creditLimit) || 5000,
        creditBalance: 0,
        totalPurchases: 0,
        notes: notes || ''
      });
    } catch (e) {
      customer = {
        _id: 'cust_' + Date.now(),
        name,
        fatherName: fatherName || '',
        phone,
        address: address || '',
        creditLimit: Number(creditLimit) || 5000,
        creditBalance: 0,
        totalPurchases: 0,
        notes: notes || '',
        createdAt: new Date()
      };
      memoryCustomers.unshift(customer);
    }
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT Update Customer details
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, fatherName, phone, address, creditLimit, notes } = req.body;
    let updated;
    try {
      updated = await Customer.findByIdAndUpdate(id, {
        name,
        fatherName,
        phone,
        address,
        creditLimit: Number(creditLimit),
        notes
      }, { new: true });
    } catch (e) {
      const idx = memoryCustomers.findIndex(c => c._id === id);
      if (idx !== -1) {
        memoryCustomers[idx] = { ...memoryCustomers[idx], name, fatherName, phone, address, creditLimit: Number(creditLimit), notes };
        updated = memoryCustomers[idx];
      }
    }
    res.json({ success: true, message: 'Customer updated', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE Customer account
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    try {
      await Customer.findByIdAndDelete(id);
    } catch (e) {
      memoryCustomers = memoryCustomers.filter(c => c._id !== id);
    }
    res.json({ success: true, message: 'Customer profile deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST Record Repayment (Payment Received from Udhar customer)
router.post('/:id/payment', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { amount, paymentMethod, notes } = req.body;
    const payAmt = Number(amount);

    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    let customer, prevBal, newBal, tx;
    try {
      customer = await Customer.findById(customerId);
      if (!customer) throw new Error('Customer not found');

      prevBal = customer.creditBalance;
      newBal = Math.max(0, prevBal - payAmt);

      customer.creditBalance = newBal;
      await customer.save();

      tx = await KhataTransaction.create({
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        type: 'PAYMENT_RECEIVED',
        amount: payAmt,
        previousBalance: prevBal,
        newBalance: newBal,
        paymentMethod: paymentMethod || 'CASH',
        notes: notes || 'Udhar repayment received'
      });
    } catch (e) {
      const idx = memoryCustomers.findIndex(c => c._id === customerId);
      if (idx !== -1) {
        customer = memoryCustomers[idx];
        prevBal = customer.creditBalance;
        newBal = Math.max(0, prevBal - payAmt);
        customer.creditBalance = newBal;

        tx = {
          _id: 'tx_' + Date.now(),
          customerId,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: 'PAYMENT_RECEIVED',
          amount: payAmt,
          previousBalance: prevBal,
          newBalance: newBal,
          paymentMethod: paymentMethod || 'CASH',
          notes: notes || 'Udhar repayment received',
          createdAt: new Date()
        };
        memoryTransactions.unshift(tx);
      }
    }

    // Generate WhatsApp payment acknowledgment text
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const waText = `🧾 *SUPERMART - Payment Receipt*
----------------------------------
👤 Customer: *${customer.name}*
📅 Date: ${dateStr}
💵 Payment Received: *₹${payAmt.toLocaleString('en-IN')}* (${paymentMethod || 'CASH'})
📉 Previous Udhar Balance: ₹${prevBal.toLocaleString('en-IN')}
💳 *Remaining Udhar Balance: ₹${newBal.toLocaleString('en-IN')}*

Thank you for your payment! 🙏`;
    const waUrl = `https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`;

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        customer,
        transaction: tx,
        whatsApp: { rawMessage: waText, waUrl }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Preview WhatsApp Udhar Notice Text
router.post('/preview-whatsapp-notice', (req, res) => {
  const { customerName, customerPhone, items, todayAmount, previousBalance, invoiceNo } = req.body;
  const todayAmt = Number(todayAmount) || 0;
  const prevBal = Number(previousBalance) || 0;
  const newBal = prevBal + todayAmt;

  const result = buildWhatsAppNotice(customerName || 'Customer', customerPhone || '', items || [], todayAmt, prevBal, newBal, invoiceNo);
  res.json({ success: true, data: result });
});

module.exports = router;
