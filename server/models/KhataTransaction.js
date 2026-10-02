const mongoose = require('mongoose');

const khataTransactionSchema = new mongoose.Schema({
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  saleId: { type: String, default: null },
  invoiceNo: { type: String, default: null },
  itemsSummary: [
    {
      name: String,
      quantity: Number,
      unit: String,
      price: Number,
      total: Number
    }
  ],
  type: {
    type: String,
    required: true,
    enum: ['CREDIT_PURCHASE', 'PAYMENT_RECEIVED'],
    default: 'CREDIT_PURCHASE'
  },
  amount: { type: Number, required: true },
  previousBalance: { type: Number, required: true, default: 0 },
  newBalance: { type: Number, required: true },
  paymentMethod: { type: String, default: 'UDHAR' },
  notes: { type: String, default: '' },
  whatsappNoticeSent: { type: Boolean, default: false },
  whatsappMessageText: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('KhataTransaction', khataTransactionSchema);
