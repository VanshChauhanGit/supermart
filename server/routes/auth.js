const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const OnlineOrder = require('../models/OnlineOrder');
const { generateToken, protect } = require('../middleware/auth');

// Helper to sanitize user object (strip password and ensure phone/mobile are aligned)
const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  const phoneNumber = userObj.phone || userObj.mobile || '';
  userObj.phone = phoneNumber;
  userObj.mobile = phoneNumber;
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

    // Validation: Role (Public registration is strictly restricted to customers; delivery boys can only be created by Admin)
    const assignedRole = 'customer';

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
                password: hashedPassword,
                address: targetAddress.trim(),
                creditLimit: 5000,
                creditBalance: 0,
                totalPurchases: 0
              });
            } else {
              existingCust.password = hashedPassword;
              if (!existingCust.name || existingCust.name === 'Walk-in Customer') {
                existingCust.name = name.trim();
              }
              await existingCust.save();
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
 * @route   POST /api/v1/auth/admin/login
 * @desc    Dedicated Store Owner / Admin Login (Only for Store Owner)
 * @access  Public (Store Owners Only)
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, mobile, phone, identifier: rawId, password } = req.body;
    const identifier = (username || rawId || mobile || phone || '').trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Owner username or mobile number is required.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.'
      });
    }

    // 1. Check in Admin collection by mobile or name/username
    let admin = null;
    if (isDbConnected()) {
      try {
        const cleanMobile = normalizeMobile(identifier);
        admin = await Admin.findOne({
          $or: [
            ...(cleanMobile ? [{ mobile: cleanMobile }] : []),
            { name: new RegExp(`^${identifier}$`, 'i') }
          ]
        });
      } catch (e) {
        console.warn('[Admin DB Check]', e.message);
      }
    }

    if (admin) {
      const isValid = await admin.comparePassword(password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect owner password. Access denied.'
        });
      }

      const adminToken = generateToken({
        id: admin._id,
        mobile: admin.mobile,
        name: admin.name,
        role: 'SUPER_ADMIN'
      });

      return res.json({
        success: true,
        message: `Welcome back, Store Owner ${admin.name}!`,
        token: adminToken,
        data: {
          _id: admin._id,
          name: admin.name,
          username: admin.name,
          mobile: admin.mobile,
          role: 'SUPER_ADMIN',
          token: adminToken
        }
      });
    }

    // 2. Default owner credentials (admin / supermart123 or 9999999999 / supermart123)
    const isDefaultAdmin = identifier.toLowerCase() === 'admin' || identifier === '9999999999';
    if (isDefaultAdmin && password === 'supermart123') {
      const adminToken = generateToken({
        id: 'admin_owner_root',
        name: 'Supermart Store Owner',
        mobile: '9999999999',
        role: 'SUPER_ADMIN'
      });

      return res.json({
        success: true,
        message: 'Welcome back, Supermart Store Owner!',
        token: adminToken,
        data: {
          _id: 'admin_owner_root',
          name: 'Supermart Store Owner',
          username: 'admin',
          mobile: '9999999999',
          role: 'SUPER_ADMIN',
          token: adminToken
        }
      });
    }

    // 3. Block customers or regular delivery users from owner portal
    if (isDbConnected()) {
      const cleanMobile = normalizeMobile(identifier);
      if (cleanMobile) {
        const isCustomer = await Customer.findOne({ phone: cleanMobile });
        const isUser = await User.findOne({ mobile: cleanMobile });
        if (isCustomer || isUser) {
          return res.status(403).json({
            success: false,
            message: 'Access Denied: This portal is strictly reserved for Store Owners and Admins only.'
          });
        }
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Store Owner credentials.'
    });

  } catch (err) {
    console.error('[Admin Login Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Owner login failed due to internal error.',
      error: err.message
    });
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Unified login — Admin, Customer, Delivery Partner all use mobile/username + password
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, mobile, phone, password } = req.body;

    // Handle admin username login
    if (username && !mobile && !phone) {
      if (username.toLowerCase() === 'admin' && password === 'supermart123') {
        const adminToken = generateToken({
          id: 'admin_owner_root',
          name: 'Supermart Store Owner',
          mobile: '9999999999',
          role: 'SUPER_ADMIN'
        });
        return res.json({
          success: true,
          message: 'Welcome back, Supermart Store Owner!',
          token: adminToken,
          data: {
            _id: 'admin_owner_root',
            name: 'Supermart Store Owner',
            username: 'admin',
            mobile: '9999999999',
            role: 'SUPER_ADMIN',
            token: adminToken
          }
        });
      }
    }

    const targetMobile = normalizeMobile(mobile || phone || username);

    if (!targetMobile || targetMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number or admin username.'
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

    // ── 2. Check User (Canonical registered account for customers & delivery partners) ──
    let user = null;
    let isUserMatch = false;
    try {
      user = await User.findOne({ mobile: targetMobile });
      if (user) {
        if (user.comparePassword) {
          isUserMatch = await user.comparePassword(password);
        } else if (user.password) {
          isUserMatch = await bcrypt.compare(password, user.password);
        }
      }
    } catch (e) {}

    // ── 3. Check Customer (Store POS customer records) ──────────────
    let customer = null;
    let isCustMatch = false;
    try {
      customer = await Customer.findOne({ phone: targetMobile });
      if (customer) {
        if (customer.comparePassword) {
          isCustMatch = await customer.comparePassword(password);
        } else if (customer.password) {
          isCustMatch = customer.password.startsWith('$2')
            ? await bcrypt.compare(password, customer.password)
            : customer.password === password;
        }
      }
    } catch (e) {}

    // Match found in User
    if (user && isUserMatch) {
      try {
        user.lastLogin = new Date();
        if (user.save) await user.save();
      } catch (e) {}

      // Keep Customer ledger password in sync if it exists
      if (customer && (!customer.password || customer.password !== user.password)) {
        try {
          customer.password = user.password;
          await customer.save();
        } catch (e) {}
      }

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

    // Match found in Customer (e.g. from POS / legacy customer)
    if (customer && isCustMatch) {
      // Sync to User if missing
      if (!user) {
        try {
          user = await User.create({
            name: customer.name,
            mobile: customer.phone,
            password: customer.password,
            role: 'customer',
            deliveryAddress: customer.address || '',
            lastLogin: new Date()
          });
        } catch (e) {}
      }

      const customerToken = generateToken({
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        role: 'customer'
      });

      const safeCustomer = customer.toObject ? customer.toObject() : { ...customer };
      delete safeCustomer.password;
      const custPhone = safeCustomer.phone || safeCustomer.mobile || '';
      safeCustomer.phone = custPhone;
      safeCustomer.mobile = custPhone;

      return res.json({
        success: true,
        message: `Welcome back, ${customer.name}!`,
        token: customerToken,
        data: { ...safeCustomer, role: 'customer' }
      });
    }

    // If an account was found in either collection, but the password was incorrect:
    if (user || customer) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

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

/**
 * ══════════════════════════════════════════════════════
 * DELIVERY BOY MANAGEMENT ENDPOINTS (Store Owner Only)
 * ══════════════════════════════════════════════════════
 */

// GET All Delivery Boys with live busy status
router.get('/admin/delivery-boys', async (req, res) => {
  try {
    let deliveryBoys = [];
    if (isDbConnected()) {
      deliveryBoys = await User.find({ role: 'delivery_partner' }).sort({ createdAt: -1 });
    }

    // Check which delivery boys currently have an active OUT_FOR_DELIVERY order
    const enrichedBoys = await Promise.all(deliveryBoys.map(async (boy) => {
      const safeBoy = sanitizeUser(boy);
      let activeOrder = null;
      try {
        activeOrder = await OnlineOrder.findOne({
          status: 'OUT_FOR_DELIVERY',
          $or: [
            { deliveryBoyId: String(boy._id) },
            { riderPhone: boy.mobile }
          ]
        });
      } catch (e) {}

      return {
        ...safeBoy,
        isBusy: Boolean(activeOrder),
        activeOrder: activeOrder ? {
          orderNo: activeOrder.orderNo,
          customerName: activeOrder.customerName,
          deliveryAddress: activeOrder.deliveryAddress
        } : null
      };
    }));

    res.json({
      success: true,
      count: enrichedBoys.length,
      data: enrichedBoys
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Create New Delivery Boy Account (Only Owner / Admin)
router.post('/admin/delivery-boys', async (req, res) => {
  try {
    const { name, mobile, phone, password, vehicleType, vehicleNumber } = req.body;
    const targetMobile = normalizeMobile(mobile || phone);

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Delivery partner name must be at least 2 characters.'
      });
    }

    if (!targetMobile || targetMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit mobile number required.'
      });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters.'
      });
    }

    // Check if phone is already registered
    const existing = await User.findOne({ mobile: targetMobile });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Phone number ${targetMobile} is already registered (${existing.role}).`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let vType = (vehicleType || 'bike').toLowerCase().trim();
    if (vType.includes('scooter') || vType.includes('ev') || vType.includes('electric')) {
      vType = 'scooter';
    } else if (vType.includes('cycle') || vType.includes('bicycle')) {
      vType = 'cycle';
    } else if (vType.includes('bike') || vType.includes('motor')) {
      vType = 'bike';
    } else {
      vType = 'other';
    }

    const newDeliveryBoy = await User.create({
      name: name.trim(),
      mobile: targetMobile,
      password: hashedPassword,
      role: 'delivery_partner',
      vehicleType: vType,
      vehicleNumber: (vehicleNumber || '').toUpperCase().trim(),
      isAvailable: true,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: `Delivery Partner account for ${newDeliveryBoy.name} created successfully!`,
      data: sanitizeUser(newDeliveryBoy)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT Update Delivery Boy Details (Name, Phone, Password, Vehicle, Active Status)
router.put('/admin/delivery-boys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, phone, password, vehicleType, vehicleNumber, isActive } = req.body;

    const user = await User.findById(id);
    if (!user || user.role !== 'delivery_partner') {
      return res.status(404).json({ success: false, message: 'Delivery partner not found.' });
    }

    if (name && name.trim().length >= 2) {
      user.name = name.trim();
    }

    const targetMobile = normalizeMobile(mobile || phone);
    if (targetMobile && targetMobile.length === 10) {
      const existing = await User.findOne({ mobile: targetMobile, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Phone number ${targetMobile} is already in use by another account.`
        });
      }
      user.mobile = targetMobile;
    }

    if (password && password.trim().length >= 4) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
    }

    if (vehicleType) {
      let vType = (vehicleType || 'bike').toLowerCase().trim();
      if (vType.includes('scooter') || vType.includes('ev') || vType.includes('electric')) {
        vType = 'scooter';
      } else if (vType.includes('cycle') || vType.includes('bicycle')) {
        vType = 'cycle';
      } else if (vType.includes('bike') || vType.includes('motor')) {
        vType = 'bike';
      } else {
        vType = 'other';
      }
      user.vehicleType = vType;
    }

    if (vehicleNumber !== undefined) {
      user.vehicleNumber = (vehicleNumber || '').toUpperCase().trim();
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();

    res.json({
      success: true,
      message: `Delivery partner ${user.name} updated successfully!`,
      data: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE Remove Delivery Boy
router.delete('/admin/delivery-boys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if delivery boy is currently out on delivery
    const activeOrder = await OnlineOrder.findOne({
      status: 'OUT_FOR_DELIVERY',
      deliveryBoyId: id
    });

    if (activeOrder) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: Delivery partner is currently delivering Order #${activeOrder.orderNo}.`
      });
    }

    await User.findByIdAndDelete(id);
    res.json({
      success: true,
      message: 'Delivery partner removed successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/v1/auth/admin/push-token
 * @desc    Register Store Owner Expo Push Token for background & closed-app alerts
 * @access  Public / Admin
 */
const {
  registerAdminPushToken,
  getAdminPushTokens,
  registerDeliveryBoyPushToken,
  getDeliveryBoyTokens,
  unregisterPushToken
} = require('../utils/pushNotifications');

router.post('/admin/push-token', (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ success: false, message: 'pushToken is required' });
    }

    const registered = registerAdminPushToken(pushToken);
    res.json({
      success: true,
      message: 'Push token registered successfully for background order alerts.',
      activeCount: getAdminPushTokens().length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/v1/auth/delivery-boy/push-token
 * @desc    Register Delivery Partner Expo Push Token for assignment alerts
 * @access  Public / Delivery Partner
 */
router.post('/delivery-boy/push-token', async (req, res) => {
  try {
    const { pushToken, deliveryBoyId, mobile } = req.body;
    if (!pushToken) {
      return res.status(400).json({ success: false, message: 'pushToken is required' });
    }

    const registered = registerDeliveryBoyPushToken({ deliveryBoyId, mobile, pushToken });

    if (isDbConnected() && deliveryBoyId) {
      try {
        await User.findByIdAndUpdate(deliveryBoyId, {
          $addToSet: { pushTokens: pushToken }
        });
      } catch (_e) {}
    }

    res.json({
      success: true,
      message: 'Delivery partner push token registered successfully.',
      tokensCount: getDeliveryBoyTokens(deliveryBoyId, mobile).length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/v1/auth/push-token/unregister
 * @desc    Unregister a device push token on logout or role change
 * @access  Public
 */
router.post('/push-token/unregister', (req, res) => {
  try {
    const { pushToken } = req.body;
    if (pushToken) {
      unregisterPushToken(pushToken);
    }
    res.json({ success: true, message: 'Push token unregistered from all roles successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
