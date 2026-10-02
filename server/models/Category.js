const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
