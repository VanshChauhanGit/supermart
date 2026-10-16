const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  fatherName: { type: String, default: '' },
  phone: { type: String, required: true, index: true },
  password: { type: String, default: '' }, // bcrypt hash — optional for POS walk-in customers
  address: { type: String, default: '' },
  savedAddresses: [
    {
      id: { type: String, default: () => 'addr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5) },
      type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
      tag: { type: String, default: 'Home' },
      address: { type: String, required: true },
      landmark: { type: String, default: '' },
      pincode: { type: String, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      isDefault: { type: Boolean, default: false }
    }
  ],
  creditLimit: { type: Number, default: 5000 },
  creditBalance: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Auto-hash password before saving (only when modified and non-empty)
customerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  // Don't double-hash already hashed values
  if (this.password.startsWith('$2')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Helper method to compare password
customerSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);
