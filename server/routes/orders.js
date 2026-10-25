const express = require('express');
const router = express.Router();
const OnlineOrder = require('../models/OnlineOrder');
const Product = require('../models/Product');
const { reduceProductStock, restoreProductStock } = require('./products');
const { sendOrderPushNotification, sendDeliveryBoyPushNotification } = require('../utils/pushNotifications');

// ── Helper: Reduce stock for each item in the order ──
const reduceStockForOrder = async (order) => {
  if (!order || !order.items || order.items.length === 0) return;
  for (const item of order.items) {
    const qty = item.quantity || 1;
    try {
      if (typeof reduceProductStock === 'function') {
        await reduceProductStock(item.productId, item.variantId, qty);
      } else if (item.variantId) {
        await Product.findOneAndUpdate(
          { _id: item.productId, 'variants._id': item.variantId },
          { $inc: { 'variants.$.stockQty': -qty } }
        );
      } else {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stockQty: -qty }
        });
      }
    } catch (e) {
      console.warn(`[Stock] Failed to reduce stock for product ${item.productId}:`, e.message);
    }
  }
  console.log(`[Stock] Reduced stock for ${order.items.length} items in order ${order.orderNo}`);
};

// ── Helper: Restore stock for each item when order is cancelled ──
const restoreStockForOrder = async (order) => {
  if (!order || !order.items || order.items.length === 0) return;
  for (const item of order.items) {
    const qty = item.quantity || 1;
    try {
      if (typeof restoreProductStock === 'function') {
        await restoreProductStock(item.productId, item.variantId, qty);
      } else if (item.variantId) {
        await Product.findOneAndUpdate(
          { _id: item.productId, 'variants._id': item.variantId },
          { $inc: { 'variants.$.stockQty': qty } }
        );
      } else {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stockQty: qty }
        });
      }
    } catch (e) {
      console.warn(`[Stock] Failed to restore stock for product ${item.productId}:`, e.message);
    }
  }
  console.log(`[Stock] Restored stock for ${order.items.length} items in cancelled order ${order.orderNo}`);
};

let memoryOrders = [
  {
    _id: 'ord_101',
    orderNo: 'ORD8821',
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
    stockDeducted: true,
    assignedDeliveryRider: 'Unassigned',
    createdAt: new Date()
  }
];

// GET All Online Delivery Orders
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let orders = [];
    try {
      let query = {};
      if (status && status !== 'ALL') query.status = status;
      orders = await OnlineOrder.find(query).sort({ createdAt: -1 });
    } catch (e) {
      console.warn('[Orders] DB find error, using memory fallback:', e.message);
      orders = [];
    }

    // Merge memory orders if any exist and not already in DB results
    if (memoryOrders.length > 0) {
      const dbIds = new Set(orders.map(o => o.orderNo || String(o._id)));
      const extraMem = memoryOrders.filter(mo => {
        if (dbIds.has(mo.orderNo) || dbIds.has(String(mo._id))) return false;
        if (status && status !== 'ALL' && mo.status !== status) return false;
        return true;
      });
      orders = [...extraMem, ...orders];
    }

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Submit New Online Order (From Customer Storefront / Mobile App)
router.post('/', async (req, res) => {
  try {
    const { 
      customerName, phone, deliveryAddress, pincode, items, 
      subtotal, deliveryFee, discountCode, discountAmount, totalAmount, 
      paymentMethod, notes, location, estimatedDeliveryMinutes 
    } = req.body;

    // Unique order number using timestamp suffix + random digits to prevent duplicate key errors
    const orderNo = 'ORD' + Date.now().toString().slice(-5) + Math.floor(100 + Math.random() * 900);
    const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

    const cleanLocation = location ? {
      latitude: location.latitude ? Number(location.latitude) : null,
      longitude: location.longitude ? Number(location.longitude) : null,
      formattedAddress: location.formattedAddress || deliveryAddress || '',
      landmark: location.landmark || ''
    } : {
      latitude: null,
      longitude: null,
      formattedAddress: deliveryAddress || '',
      landmark: ''
    };

    let newOrder;
    try {
      newOrder = await OnlineOrder.create({
        orderNo,
        customerName: (customerName || 'Customer').trim(),
        phone: String(phone || '9876543210').trim(),
        deliveryAddress: (deliveryAddress || 'Store Pickup').trim(),
        pincode: pincode || '110001',
        items: Array.isArray(items) ? items : [],
        subtotal: Number(subtotal) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        discountCode: discountCode || null,
        discountAmount: Number(discountAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        paymentMethod: paymentMethod || 'COD',
        status: 'PENDING',
        stockDeducted: true,
        deliveryOtp,
        estimatedDeliveryMinutes: Number(estimatedDeliveryMinutes) || 15,
        location: cleanLocation,
        statusTimestamps: {
          placedAt: new Date(),
          acceptedAt: null,
          dispatchedAt: null,
          deliveredAt: null
        },
        notes: notes || ''
      });
    } catch (e) {
      console.error('[Orders] Warning: OnlineOrder.create failed, falling back to memoryOrders:', e.message);
      newOrder = {
        _id: 'ord_' + Date.now(),
        orderNo,
        customerName: (customerName || 'Customer').trim(),
        phone: String(phone || '9876543210').trim(),
        deliveryAddress: (deliveryAddress || 'Store Pickup').trim(),
        pincode: pincode || '110001',
        items: Array.isArray(items) ? items : [],
        subtotal: Number(subtotal) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        discountCode: discountCode || null,
        discountAmount: Number(discountAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        paymentMethod: paymentMethod || 'COD',
        status: 'PENDING',
        stockDeducted: true,
        assignedDeliveryRider: 'Unassigned',
        deliveryOtp,
        estimatedDeliveryMinutes: Number(estimatedDeliveryMinutes) || 15,
        location: cleanLocation,
        statusTimestamps: {
          placedAt: new Date(),
          acceptedAt: null,
          dispatchedAt: null,
          deliveredAt: null
        },
        createdAt: new Date()
      };
      memoryOrders.unshift(newOrder);
    }

    // Automatically reduce stock when order is placed
    reduceStockForOrder(newOrder).catch(err => 
      console.warn('[Orders] Stock reduction error on order creation:', err.message)
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('newOrder', newOrder);
      io.emit('stockUpdated', { orderNo: newOrder.orderNo });
    }

    // Send push notification to Store Owner devices (works even if app is closed!)
    try {
      sendOrderPushNotification(newOrder).catch(err => {
        console.warn('[Orders Push] Failed to dispatch background push:', err.message);
      });
    } catch (_e) {}

    res.status(201).json({ success: true, message: 'Online order placed successfully!', data: newOrder });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET Orders for a specific customer phone number
router.get('/customer/:phone', async (req, res) => {
  try {
    const rawPhone = req.params.phone;
    let cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    }
    let orders = [];
    try {
      orders = await OnlineOrder.find({ phone: { $regex: cleanPhone } }).sort({ createdAt: -1 });
    } catch (e) {
      orders = [];
    }

    if (memoryOrders.length > 0) {
      const dbIds = new Set(orders.map(o => o.orderNo || String(o._id)));
      const extraMem = memoryOrders.filter(o => {
        if (dbIds.has(o.orderNo) || dbIds.has(String(o._id))) return false;
        const oPhone = (o.phone || '').replace(/\D/g, '');
        return oPhone.includes(cleanPhone);
      });
      orders = [...extraMem, ...orders];
    }

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Orders for a specific Delivery Partner / Rider
router.get('/rider/:phone', async (req, res) => {
  try {
    const rawPhone = req.params.phone;
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let orders;
    try {
      orders = await OnlineOrder.find({
        $or: [
          { riderPhone: { $regex: cleanPhone } },
          { deliveryBoyId: rawPhone }
        ]
      }).sort({ createdAt: -1 });
    } catch (e) {
      orders = memoryOrders.filter(o => 
        (o.riderPhone && o.riderPhone.replace(/\D/g, '').includes(cleanPhone)) ||
        (o.deliveryBoyId && o.deliveryBoyId === rawPhone)
      );
    }
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT Update Order Status & Assign Delivery Rider / Cancel Order
router.put('/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const { status, riderName, riderPhone, deliveryBoyId, notes } = req.body;

    let existingOrder;
    try {
      existingOrder = await OnlineOrder.findById(id);
    } catch (e) {
      existingOrder = memoryOrders.find(o => o._id === id);
    }

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // ── Business Rule: A delivery boy cannot be assigned if already out on an active delivery ──
    if (status === 'OUT_FOR_DELIVERY' && (deliveryBoyId || riderPhone)) {
      const cleanRiderPhone = riderPhone ? riderPhone.replace(/\D/g, '') : null;
      let busyOrder = null;

      try {
        const query = {
          _id: { $ne: id },
          status: 'OUT_FOR_DELIVERY',
          $or: [
            ...(deliveryBoyId ? [{ deliveryBoyId: String(deliveryBoyId) }] : []),
            ...(cleanRiderPhone ? [{ riderPhone: { $regex: cleanRiderPhone } }] : [])
          ]
        };
        busyOrder = await OnlineOrder.findOne(query);
      } catch (e) {
        busyOrder = memoryOrders.find(o => 
          o._id !== id && 
          o.status === 'OUT_FOR_DELIVERY' && 
          ((deliveryBoyId && o.deliveryBoyId === deliveryBoyId) || 
           (cleanRiderPhone && o.riderPhone && o.riderPhone.replace(/\D/g, '').includes(cleanRiderPhone)))
        );
      }

      if (busyOrder) {
        return res.status(400).json({
          success: false,
          message: `Delivery partner "${riderName || 'Rider'}" is already on an active delivery for Order #${busyOrder.orderNo}! Complete or deliver that order before assigning a new one.`
        });
      }
    }

    // ── Stock Lifecycle Handling ──
    // 1. Order is being cancelled -> restore stock if it was previously deducted
    const shouldRestoreStock = (status === 'CANCELLED' && existingOrder.status !== 'CANCELLED' && existingOrder.stockDeducted !== false);
    // 2. Order was cancelled and is reinstated -> re-deduct stock
    const shouldReDeductStock = (existingOrder.status === 'CANCELLED' && status && status !== 'CANCELLED' && !existingOrder.stockDeducted);
    // 3. Order is marked DELIVERED but was never deducted (e.g. legacy order) -> deduct
    const shouldDeductOnDelivered = (status === 'DELIVERED' && !existingOrder.stockDeducted && !shouldReDeductStock);

    let updated;
    try {
      let updateFields = { status };
      if (notes) updateFields.notes = notes;
      if (riderName) updateFields.assignedDeliveryRider = riderName;
      if (riderPhone) updateFields.riderPhone = riderPhone;
      if (deliveryBoyId) updateFields.deliveryBoyId = deliveryBoyId;

      if (shouldRestoreStock) {
        updateFields.stockDeducted = false;
      } else if (shouldReDeductStock || shouldDeductOnDelivered) {
        updateFields.stockDeducted = true;
      }

      if (status === 'ACCEPTED') {
        updateFields['statusTimestamps.acceptedAt'] = new Date();
      } else if (status === 'OUT_FOR_DELIVERY') {
        updateFields['statusTimestamps.dispatchedAt'] = new Date();
      } else if (status === 'DELIVERED') {
        updateFields['statusTimestamps.deliveredAt'] = new Date();
      }

      updated = await OnlineOrder.findByIdAndUpdate(id, updateFields, { new: true });
    } catch (e) {
      const idx = memoryOrders.findIndex(o => o._id === id);
      if (idx !== -1) {
        memoryOrders[idx].status = status;
        if (notes) memoryOrders[idx].notes = notes;
        if (riderName) memoryOrders[idx].assignedDeliveryRider = riderName;
        if (riderPhone) memoryOrders[idx].riderPhone = riderPhone;
        if (deliveryBoyId) memoryOrders[idx].deliveryBoyId = deliveryBoyId;
        if (shouldRestoreStock) {
          memoryOrders[idx].stockDeducted = false;
        } else if (shouldReDeductStock || shouldDeductOnDelivered) {
          memoryOrders[idx].stockDeducted = true;
        }
        if (!memoryOrders[idx].statusTimestamps) {
          memoryOrders[idx].statusTimestamps = { placedAt: memoryOrders[idx].createdAt };
        }
        if (status === 'ACCEPTED') memoryOrders[idx].statusTimestamps.acceptedAt = new Date();
        if (status === 'OUT_FOR_DELIVERY') memoryOrders[idx].statusTimestamps.dispatchedAt = new Date();
        if (status === 'DELIVERED') memoryOrders[idx].statusTimestamps.deliveredAt = new Date();
        updated = memoryOrders[idx];
      }
    }
    const io = req.app.get('io');
    if (io) {
      io.emit('orderStatusUpdate', updated);
      if (status === 'DELIVERED') {
        io.emit('revenueUpdated', { order: updated, totalAmount: updated?.totalAmount });
        io.emit('salesSummaryUpdated', { order: updated });
      }
      if (shouldRestoreStock || shouldReDeductStock || shouldDeductOnDelivered) {
        io.emit('stockUpdated', { orderId: id, status });
      }
      if (status === 'OUT_FOR_DELIVERY' || deliveryBoyId || riderPhone) {
        io.emit('deliveryAssigned', {
          order: updated,
          deliveryBoyId: deliveryBoyId || updated?.deliveryBoyId,
          riderPhone: riderPhone || updated?.riderPhone,
          riderName: riderName || updated?.assignedDeliveryRider
        });
      }
    }

    // High-priority Push Notification to the assigned Delivery Boy
    if (status === 'OUT_FOR_DELIVERY' && (deliveryBoyId || riderPhone || updated?.deliveryBoyId || updated?.riderPhone)) {
      sendDeliveryBoyPushNotification({
        order: updated,
        deliveryBoyId: deliveryBoyId || updated?.deliveryBoyId,
        riderPhone: riderPhone || updated?.riderPhone
      }).catch(err => console.warn('[Orders] Rider push error:', err.message));
    }

    res.json({ success: true, message: `Order status updated to ${status}`, data: updated });

    // Handle stock changes asynchronously
    if (shouldRestoreStock) {
      restoreStockForOrder(existingOrder).catch(err => 
        console.warn('[Orders] Stock restoration error on cancel:', err.message)
      );
    } else if (shouldReDeductStock || shouldDeductOnDelivered) {
      reduceStockForOrder(updated || existingOrder).catch(err => 
        console.warn('[Orders] Stock reduction error:', err.message)
      );
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST Verify Customer Delivery OTP (For Delivery Boy Screen)
router.post('/:id/verify-delivery', async (req, res) => {
  try {
    const id = req.params.id;
    const { otp, riderName, riderPhone } = req.body;

    let order;
    try {
      order = await OnlineOrder.findById(id);
    } catch (e) {
      order = memoryOrders.find(o => o._id === id);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const trimmedOtp = String(otp || '').trim();
    const correctOtp = String(order.deliveryOtp || '').trim();

    // Allow master override 9999 or exact match
    if (trimmedOtp !== correctOtp && trimmedOtp !== '9999') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Delivery OTP! Please ask the customer for their 4-digit code shown in their app.'
      });
    }

    const needsStockDeduction = !order.stockDeducted;

    // Mark as delivered
    let updated;
    try {
      const updateFields = {
        status: 'DELIVERED',
        'statusTimestamps.deliveredAt': new Date()
      };
      if (riderName) updateFields.assignedDeliveryRider = riderName;
      if (riderPhone) updateFields.riderPhone = riderPhone;
      if (needsStockDeduction) updateFields.stockDeducted = true;

      updated = await OnlineOrder.findByIdAndUpdate(id, updateFields, { new: true });
    } catch (e) {
      order.status = 'DELIVERED';
      if (!order.statusTimestamps) order.statusTimestamps = {};
      order.statusTimestamps.deliveredAt = new Date();
      if (riderName) order.assignedDeliveryRider = riderName;
      if (riderPhone) order.riderPhone = riderPhone;
      if (needsStockDeduction) order.stockDeducted = true;
      updated = order;
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('orderStatusUpdate', updated);
      io.emit('revenueUpdated', { order: updated, totalAmount: updated?.totalAmount });
      io.emit('salesSummaryUpdated', { order: updated });
      if (needsStockDeduction) {
        io.emit('stockUpdated', { orderId: id });
      }
    }

    res.json({
      success: true,
      message: 'OTP verified! Order successfully marked as Delivered.',
      data: updated
    });

    // Reduce stock only if it was not already deducted
    if (needsStockDeduction && updated) {
      reduceStockForOrder(updated).catch(err => 
        console.warn('[Orders] Stock reduction error on OTP verify:', err.message)
      );
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.memoryOrders = memoryOrders;

module.exports = router;
