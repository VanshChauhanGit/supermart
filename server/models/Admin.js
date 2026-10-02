const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    default: 'Supermart Store Owner',
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    default: 'SUPER_ADMIN'
  }
}, { timestamps: true });

// Auto-hash password before saving (only when modified)
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  if (this.password.startsWith('$2')) return next(); // already hashed
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password against stored bcrypt hash
adminSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
