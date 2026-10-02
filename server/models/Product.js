const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  category: { 
    type: String, 
    required: true,
    default: 'Grocery'
  },
  subCategory: { type: String, default: 'General' },
  unit: { type: String, required: true, enum: ['kg', 'g', 'pcs', 'ltr', 'ml', 'pack', 'box'], default: 'pcs' },
  purchasePrice: { type: Number, required: true, min: 0 },
  mrp: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  stockQty: { type: Number, required: true, default: 0 },
  reorderLevel: { type: Number, default: 5 },
  imageUrl: { type: String, default: '' },
  isAvailableForOnline: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
