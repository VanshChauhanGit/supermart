const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' }, // Home, Work, Other
  street: { type: String, default: '' },
  city: { type: String, default: '' },
  pincode: { type: String, default: '' },
  landmark: { type: String, default: '' },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['customer', 'delivery_partner', 'admin'],
    default: 'customer'
  },
  // Primary delivery address for quick checkout
  deliveryAddress: {
    type: String,
    default: ''
  },
  pincode: {
    type: String,
    default: ''
  },
  // Multiple saved addresses for delivery app customers
  addresses: [addressSchema],
  // Delivery Partner specific fields
  isAvailable: {
    type: Boolean,
    default: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'scooter', 'cycle', 'other', ''],
    default: ''
  },
  vehicleNumber: {
    type: String,
    default: ''
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compare entered password with hashed password in DB
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    return false;
  }
};

// Safe JSON serialization helper to never return password
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
