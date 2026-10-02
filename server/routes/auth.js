const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const { generateToken, protect } = require('../middleware/auth');

// Helper to sanitize user object (strip password)
const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  return userObj;
};

// Clean and normalize mobile number (10-digit format)
const normalizeMobile = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  // If number starts with 91 and has 12 digits, strip country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
};

const isDbConnected = () => require('mongoose').connection && require('mongoose').connection.readyState === 1;

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (Customer or Delivery Partner) with Name, Mobile & Password
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      mobile,
      phone, // alias for mobile
      password,
      role = 'customer', // 'customer' or 'delivery_partner'
      deliveryAddress = '',
      address = '', // alias for deliveryAddress
      pincode = '',
      vehicleType = '',
      vehicleNumber = ''
    } = req.body;

    const targetMobile = normalizeMobile(mobile || phone);
    const targetAddress = deliveryAddress || address || '';

    // Validation: Name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters long.'
      });
    }

    // Validation: Mobile number (must be 10 digits)
    if (!targetMobile || targetMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number (e.g. 9876543210).'
      });
    }

    // Validation: Password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters long.'
      });
    }

    // Validation: Role
    const validRoles = ['customer', 'delivery_partner'];
    const assignedRole = validRoles.includes(role) ? role : 'customer';

    // Check if mobile number is already registered
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please try again later.'
      });
    }

    let existingUser = null;
    try {
      existingUser = await User.findOne({ mobile: targetMobile });
    } catch (e) {
      return res.status(503).json({ success: false, message: 'Database error. Please try again.' });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Mobile number ${targetMobile} is already registered. Please login.`
      });
    }

    // Hash password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Initial addresses array if delivery address is provided
    const initialAddresses = [];
    if (targetAddress) {
      initialAddresses.push({
        label: 'Home',
        street: targetAddress.trim(),
        city: '',
        pincode: pincode.trim(),
        isDefault: true
      });
    }

    let newUser = null;

    if (isDbConnected()) {
      try {
        newUser = await User.create({
          name: name.trim(),
          mobile: targetMobile,
          password: hashedPassword,
          role: assignedRole,
          deliveryAddress: targetAddress.trim(),
          pincode: pincode.trim(),
          addresses: initialAddresses,
          vehicleType: assignedRole === 'delivery_partner' ? (vehicleType || 'bike') : '',
          vehicleNumber: assignedRole === 'delivery_partner' ? (vehicleNumber || '') : '',
          isAvailable: true,
          isActive: true,
          lastLogin: new Date()
        });

        // Synchronize with Customer model if role is customer for store POS & Udhar integration
        if (assignedRole === 'customer') {
          try {
            const existingCust = await Customer.findOne({ phone: targetMobile });
            if (!existingCust) {
              await Customer.create({
                name: name.trim(),
                phone: targetMobile,
                address: targetAddress.trim(),
                creditLimit: 5000,
                creditBalance: 0,
                totalPurchases: 0
              });
            }
          } catch (custErr) {
            console.warn('[Customer Sync] Notice: Customer ledger sync non-critical:', custErr.message);
          }
        }
      } catch (dbErr) {
        // DB error fallback
      }
    }

    if (!newUser) {
      return res.status(500).json({
        success: false,
        message: 'Registration failed. Could not save user to database. Please try again.'
      });
    }

    // Generate JWT Auth Token
    const token = generateToken({
      id: newUser._id,
      name: newUser.name,
      mobile: newUser.mobile,
      role: newUser.role
    });

    const safeData = sanitizeUser(newUser);

    return res.status(201).json({
      success: true,
      message: `${assignedRole === 'delivery_partner' ? 'Delivery Partner' : 'Customer'} registered successfully!`,
      token,
      data: safeData
    });

  } catch (err) {
    console.error('[Register Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to internal error.',
      error: err.message
    });
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Unified login — Admin, Customer, Delivery Partner all use mobile + password
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { mobile, phone, password } = req.body;

    const targetMobile = normalizeMobile(mobile || phone);

    if (!targetMobile || targetMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.'
      });
    }

    // ── 1. Admin ────────────────────────────────────────────────
    if (isDbConnected()) {
      try {
        const admin = await Admin.findOne({ mobile: targetMobile });
        if (admin) {
          const isValid = await admin.comparePassword(password);
          if (!isValid) {
            return res.status(401).json({
              success: false,
              message: 'Incorrect password. Please try again.'
            });
          }

          const adminToken = generateToken({
            id: admin._id,
            mobile: admin.mobile,
            name: admin.name,
            role: 'admin'
          });

          return res.json({
            success: true,
            message: `Welcome back, ${admin.name}!`,
            token: adminToken,
            data: {
              _id: admin._id,
              mobile: admin.mobile,
              name: admin.name,
              role: admin.role,
              token: adminToken
            }
          });
        }
      } catch (e) {}
    }

    // ── 2. Customer ──────────────────────────────────────────────
    try {
      const customer = await Customer.findOne({ phone: targetMobile });
      if (customer) {
        let isMatch = false;
        if (customer.comparePassword) {
          isMatch = await customer.comparePassword(password);
        } else if (customer.password) {
          isMatch = customer.password.startsWith('$2')
            ? await bcrypt.compare(password, customer.password)
            : customer.password === password;
        }

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Incorrect password. Please try again.'
          });
        }

        const customerToken = generateToken({
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          role: 'customer'
        });

        const safeCustomer = customer.toObject ? customer.toObject() : { ...customer };
        delete safeCustomer.password;

        return res.json({
          success: true,
          message: `Welcome back, ${customer.name}!`,
          token: customerToken,
          data: { ...safeCustomer, role: 'customer' }
        });
      }
    } catch (e) {}

    // ── 3. Delivery Partner / User ───────────────────────────────
    try {
      const user = await User.findOne({ mobile: targetMobile });
      if (user) {
        let isMatch = false;
        if (user.comparePassword) {
          isMatch = await user.comparePassword(password);
        } else {
          isMatch = await bcrypt.compare(password, user.password);
        }

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Incorrect password. Please try again.'
          });
        }

        try {
          user.lastLogin = new Date();
          if (user.save) await user.save();
        } catch (e) {}

        const token = generateToken({
          id: user._id,
          name: user.name,
          mobile: user.mobile,
          role: user.role
        });

        const safeData = sanitizeUser(user);
        return res.json({
          success: true,
          message: `Welcome back, ${user.name}!`,
          token,
          data: safeData
        });
      }
    } catch (e) {}

    // ── Not found in any collection ──────────────────────────────
    return res.status(404).json({
      success: false,
      message: 'No account found with this mobile number.'
    });

  } catch (err) {
    console.error('[Login Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed due to internal error.',
      error: err.message
    });
  }
});




/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged in user's profile
 * @access  Private (Bearer Token)
 */
router.get('/me', protect, async (req, res) => {
  try {
    let user = null;
    try {
      user = await User.findById(req.user._id || req.user.id).select('-password');
    } catch (e) {}

    if (!user) {
      user = memoryUsers.find(u => String(u._id) === String(req.user._id || req.user.id)) || req.user;
    }

    return res.json({
      success: true,
      data: sanitizeUser(user)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile details (delivery address, name, rider status)
 * @access  Private (Bearer Token)
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      name,
      deliveryAddress,
      pincode,
      addresses,
      isAvailable,
      vehicleType,
      vehicleNumber
    } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (deliveryAddress !== undefined) updateFields.deliveryAddress = deliveryAddress.trim();
    if (pincode !== undefined) updateFields.pincode = pincode.trim();
    if (Array.isArray(addresses)) updateFields.addresses = addresses;
    if (isAvailable !== undefined) updateFields.isAvailable = Boolean(isAvailable);
    if (vehicleType !== undefined) updateFields.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) updateFields.vehicleNumber = vehicleNumber;

    let updatedUser = null;
    try {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password');
    } catch (e) {
      const idx = memoryUsers.findIndex(u => String(u._id) === String(userId));
      if (idx !== -1) {
        memoryUsers[idx] = { ...memoryUsers[idx], ...updateFields, updatedAt: new Date() };
        updatedUser = memoryUsers[idx];
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: sanitizeUser(updatedUser)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change password
 * @access  Private (Bearer Token)
 */
router.put('/change-password', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    let user = null;
    try {
      user = await User.findById(userId);
    } catch (e) {}

    if (!user) {
      user = memoryUsers.find(u => String(u._id) === String(userId));
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password does not match.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    try {
      user.password = newHash;
      if (user.save) await user.save();
    } catch (e) {
      user.password = newHash;
    }

    return res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   GET /api/v1/auth/verify
 * @desc    Verify current session / token
 * @access  Public
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization || req.headers['x-auth-token'];
  if (!authHeader) {
    return res.json({ success: true, authenticated: false });
  }

  if (authHeader.includes('token_admin_')) {
    return res.json({ success: true, authenticated: true, role: 'admin' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, authenticated: true, user: decoded });
  } catch (e) {
    return res.json({ success: true, authenticated: false, message: 'Token invalid or expired' });
  }
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
