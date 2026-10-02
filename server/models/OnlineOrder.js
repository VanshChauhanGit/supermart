const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  quantity: Number,
  unit: String,
  total: Number
});

const onlineOrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true, index: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  pincode: { type: String, default: '' },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  discountCode: { type: String, default: null },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['COD', 'ONLINE_UPI'], default: 'COD' },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  assignedDeliveryRider: { type: String, default: 'Unassigned' },
  riderPhone: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('OnlineOrder', onlineOrderSchema);
