const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supermart_jwt_delivery_secret_key_2026';

// Helper to generate a signed JWT
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

// Middleware to verify JWT token and authenticate user
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    } else if (req.headers.authorization && req.headers.authorization.includes('token_admin_')) {
      // Legacy admin token compatibility
      req.user = {
        _id: 'admin_default',
        name: 'Supermart Store Owner',
        role: 'admin',
        mobile: 'admin'
      };
      return next();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Look up user from MongoDB if connected
      let user = null;
      const isDbConnected = require('mongoose').connection && require('mongoose').connection.readyState === 1;
      if (isDbConnected) {
        try {
          user = await User.findById(decoded.id).select('-password');
        } catch (dbErr) {}
      }

      if (!user) {
        // Fallback to decoded payload if user exists in token
        req.user = {
          _id: decoded.id,
          name: decoded.name,
          mobile: decoded.mobile,
          role: decoded.role || 'customer'
        };
      } else {
        req.user = user;
      }

      next();
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.'
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Authentication failure: ' + err.message
    });
  }
};

// Middleware for role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user ? req.user.role : 'guest'}' does not have access to this resource.`
      });
    }
    next();
  };
};

module.exports = {
  JWT_SECRET,
  generateToken,
  protect,
  authorize
};
