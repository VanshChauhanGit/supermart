const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');

let memoryOffers = [];

// Apply offer logic
const calculateDiscount = (offer, subtotal) => {
  if (subtotal < offer.minOrderValue) {
    return { success: false, message: `Minimum order value of ₹${offer.minOrderValue} required.` };
  }

  let discount = 0;
  let deliveryFee = 40; // Base delivery fee, ideally fetched from settings

  if (offer.discountType === 'FLAT') {
    discount = offer.discountValue;
  } else if (offer.discountType === 'PERCENTAGE') {
    discount = (subtotal * offer.discountValue) / 100;
    if (offer.maxDiscount && discount > offer.maxDiscount) {
      discount = offer.maxDiscount;
    }
  } else if (offer.discountType === 'FREE_DELIVERY') {
    deliveryFee = 0;
  }

  return { success: true, discount, deliveryFee, message: 'Offer applied successfully!' };
};

// GET all active offers
router.get('/', async (req, res) => {
  try {
    let offers;
    try {
      offers = await Offer.find({ isActive: true });
    } catch (e) {
      offers = memoryOffers.filter(o => o.isActive);
    }
    res.json({ success: true, data: offers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all offers (for admin)
router.get('/admin', async (req, res) => {
  try {
    let offers;
    try {
      offers = await Offer.find().sort({ createdAt: -1 });
    } catch (e) {
      offers = memoryOffers;
    }
    res.json({ success: true, data: offers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Create Offer
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    data.code = data.code.toUpperCase();
    let offer;
    try {
      offer = await Offer.create(data);
    } catch (e) {
      offer = { _id: 'off_' + Date.now(), ...data, createdAt: new Date() };
      memoryOffers.push(offer);
    }
    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT Update Offer
router.put('/:id', async (req, res) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase();
    let offer;
    try {
      offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    } catch (e) {
      const idx = memoryOffers.findIndex(o => o._id === req.params.id);
      if (idx !== -1) {
        memoryOffers[idx] = { ...memoryOffers[idx], ...req.body };
        offer = memoryOffers[idx];
      }
    }
    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE Offer
router.delete('/:id', async (req, res) => {
  try {
    try {
      await Offer.findByIdAndDelete(req.params.id);
    } catch (e) {
      memoryOffers = memoryOffers.filter(o => o._id !== req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST Apply Offer
router.post('/apply', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    let offer;
    try {
      offer = await Offer.findOne({ code: code.toUpperCase(), isActive: true });
    } catch (e) {
      offer = memoryOffers.find(o => o.code === code.toUpperCase() && o.isActive);
    }

    if (!offer) {
      return res.status(400).json({ success: false, message: 'Invalid or expired promo code.' });
    }

    const result = calculateDiscount(offer, Number(subtotal));
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      data: {
        code: offer.code,
        discount: result.discount,
        deliveryFee: result.deliveryFee,
        message: result.message
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
