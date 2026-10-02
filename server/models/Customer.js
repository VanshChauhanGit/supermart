const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  fatherName: { type: String, default: '' },
  phone: { type: String, required: true, index: true },
  password: { type: String, default: '' }, // bcrypt hash — optional for POS walk-in customers
  address: { type: String, default: '' },
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
