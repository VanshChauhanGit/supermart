const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  barcode: { type: String, default: '' },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'pcs' },
  total: { type: Number, required: true }
});

const saleSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, default: null },
  customerName: { type: String, default: 'Walk-in Customer' },
  customerPhone: { type: String, default: '' },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMode: { 
    type: String, 
    required: true,
    enum: ['CASH', 'UPI', 'CARD', 'UDHAR'],
    default: 'CASH'
  },
  paymentStatus: { type: String, enum: ['PAID', 'PENDING_UDHAR'], default: 'PAID' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
