const express = require('express');
const router = express.Router();
const OnlineOrder = require('../models/OnlineOrder');

let memoryOrders = [
  {
    _id: 'ord_101',
    orderNo: 'ORD-8821',
    customerName: 'Priya Verma',
    phone: '9898989898',
    deliveryAddress: 'Flat 401, Sun City Heights, Sector 12',
    pincode: '110045',
    items: [
      { productId: 'prod_1', name: 'Aashirvaad Atta 5kg', price: 235, quantity: 1, unit: 'pcs', total: 235 },
      { productId: 'prod_2', name: 'Amul Milk 1L', price: 66, quantity: 2, unit: 'ltr', total: 132 }
    ],
    subtotal: 367,
    deliveryFee: 30,
    totalAmount: 397,
    paymentMethod: 'COD',
    status: 'PENDING',
    assignedDeliveryRider: 'Unassigned',
    createdAt: new Date()
  }
];

// GET All Online Delivery Orders
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let orders;
    try {
      let query = {};
      if (status && status !== 'ALL') query.status = status;
      orders = await OnlineOrder.find(query).sort({ createdAt: -1 });
    } catch (e) {
      orders = memoryOrders.filter(o => {
        if (status && status !== 'ALL' && o.status !== status) return false;
        return true;
      });
    }
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Submit New Online Order (From Customer Storefront / Mobile App)
router.post('/', async (req, res) => {
  try {
    const { customerName, phone, deliveryAddress, pincode, items, subtotal, deliveryFee, discountCode, discountAmount, totalAmount, paymentMethod, notes } = req.body;

    const orderNo = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

    let newOrder;
    try {
      newOrder = await OnlineOrder.create({
        orderNo,
        customerName,
        phone,
        deliveryAddress,
        pincode: pincode || '110001',
        items,
        subtotal: Number(subtotal),
        deliveryFee: Number(deliveryFee) || 0,
        discountCode: discountCode || null,
        discountAmount: Number(discountAmount) || 0,
        totalAmount: Number(totalAmount),
        paymentMethod: paymentMethod || 'COD',
        status: 'PENDING',
        notes: notes || ''
      });
    } catch (e) {
      newOrder = {
        _id: 'ord_' + Date.now(),
        orderNo,
        customerName,
        phone,
        deliveryAddress,
        pincode: pincode || '110001',
        items,
        subtotal: Number(subtotal),
        deliveryFee: Number(deliveryFee) || 0,
        discountCode: discountCode || null,
        discountAmount: Number(discountAmount) || 0,
        totalAmount: Number(totalAmount),
        paymentMethod: paymentMethod || 'COD',
        status: 'PENDING',
        assignedDeliveryRider: 'Unassigned',
        createdAt: new Date()
      };
      memoryOrders.unshift(newOrder);
    }
    const io = req.app.get('io');
    if (io) {
      io.emit('newOrder', newOrder);
    }

    res.status(201).json({ success: true, message: 'Online order placed successfully!', data: newOrder });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET Orders for a specific customer phone number
router.get('/customer/:phone', async (req, res) => {
  try {
    const rawPhone = req.params.phone;
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let orders;
    try {
      orders = await OnlineOrder.find({ phone: { $regex: cleanPhone } }).sort({ createdAt: -1 });
    } catch (e) {
      orders = memoryOrders.filter(o => o.phone && o.phone.replace(/\D/g, '').includes(cleanPhone));
    }
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT Update Order Status & Assign Delivery Rider
router.put('/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const { status, riderName, riderPhone } = req.body;

    let updated;
    try {
      let updateFields = { status };
      if (riderName) updateFields.assignedDeliveryRider = riderName;
      if (riderPhone) updateFields.riderPhone = riderPhone;

      updated = await OnlineOrder.findByIdAndUpdate(id, updateFields, { new: true });
    } catch (e) {
      const idx = memoryOrders.findIndex(o => o._id === id);
      if (idx !== -1) {
        memoryOrders[idx].status = status;
        if (riderName) memoryOrders[idx].assignedDeliveryRider = riderName;
        if (riderPhone) memoryOrders[idx].riderPhone = riderPhone;
        updated = memoryOrders[idx];
      }
    }
    const io = req.app.get('io');
    if (io) {
      io.emit('orderStatusUpdate', updated);
    }

    res.json({ success: true, message: `Order status updated to ${status}`, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
