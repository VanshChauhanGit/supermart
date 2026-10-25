const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// In-memory fallback
let memorySettings = {
  deliveryFee: 30,
  freeDeliveryThreshold: 300,
  paymentQrUrl: '',
  upiId: '',
  updatedAt: new Date()
};

// GET current store settings
router.get('/', async (req, res) => {
  try {
    let settings;
    try {
      settings = await Setting.findOne();
      if (!settings) {
        settings = await Setting.create({
          deliveryFee: 30,
          freeDeliveryThreshold: 300,
          paymentQrUrl: '',
          upiId: ''
        });
      }
    } catch (e) {
      settings = memorySettings;
    }

    res.json({
      success: true,
      data: {
        deliveryFee: Number(settings.deliveryFee ?? 30),
        freeDeliveryThreshold: Number(settings.freeDeliveryThreshold ?? 300),
        paymentQrUrl: settings.paymentQrUrl || '',
        upiId: settings.upiId || '',
        updatedAt: settings.updatedAt || new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update store settings
router.put('/', async (req, res) => {
  try {
    const { deliveryFee, freeDeliveryThreshold, paymentQrUrl, upiId } = req.body;

    const parsedDeliveryFee = deliveryFee !== undefined ? Math.max(0, Number(deliveryFee)) : undefined;
    const parsedThreshold = freeDeliveryThreshold !== undefined ? Math.max(0, Number(freeDeliveryThreshold)) : undefined;

    let updated;
    try {
      let doc = await Setting.findOne();
      if (!doc) {
        doc = new Setting();
      }
      if (parsedDeliveryFee !== undefined) doc.deliveryFee = parsedDeliveryFee;
      if (parsedThreshold !== undefined) doc.freeDeliveryThreshold = parsedThreshold;
      if (paymentQrUrl !== undefined) doc.paymentQrUrl = String(paymentQrUrl).trim();
      if (upiId !== undefined) doc.upiId = String(upiId).trim();
      doc.updatedAt = new Date();
      updated = await doc.save();
    } catch (e) {
      if (parsedDeliveryFee !== undefined) memorySettings.deliveryFee = parsedDeliveryFee;
      if (parsedThreshold !== undefined) memorySettings.freeDeliveryThreshold = parsedThreshold;
      if (paymentQrUrl !== undefined) memorySettings.paymentQrUrl = String(paymentQrUrl).trim();
      if (upiId !== undefined) memorySettings.upiId = String(upiId).trim();
      memorySettings.updatedAt = new Date();
      updated = memorySettings;
    }

    const payload = {
      deliveryFee: Number(updated.deliveryFee),
      freeDeliveryThreshold: Number(updated.freeDeliveryThreshold),
      paymentQrUrl: updated.paymentQrUrl || '',
      upiId: updated.upiId || '',
      updatedAt: updated.updatedAt
    };

    // Broadcast update in real-time via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:updated', payload);
    }

    res.json({
      success: true,
      message: 'Store settings updated successfully',
      data: payload
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
