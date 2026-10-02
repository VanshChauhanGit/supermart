const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  discountType: { type: String, enum: ['PERCENTAGE', 'FLAT', 'FREE_DELIVERY'], required: true },
  discountValue: { type: Number, required: true }, // e.g. 50 (flat/percent) or 0
  minOrderValue: { type: Number, default: 0 },
  maxDiscount: { type: Number }, // Cap for percentage discount
  isActive: { type: Boolean, default: true },
  expiryDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
