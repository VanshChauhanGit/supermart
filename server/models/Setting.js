const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  deliveryFee: {
    type: Number,
    default: 10,
    min: 0
  },
  freeDeliveryThreshold: {
    type: Number,
    default: 999,
    min: 0
  },
  paymentQrUrl: {
    type: String,
    default: ''
  },
  upiId: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Setting', SettingSchema);
