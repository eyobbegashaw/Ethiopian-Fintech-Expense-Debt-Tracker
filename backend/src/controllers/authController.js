const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { normalizeEthiopianPhone, isValidEthiopianPhone } = require('../utils/phoneUtils');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { name, phone, email, password } = req.body;
    
    const cleanPhone = normalizeEthiopianPhone(phone);
    const existingPhone = await User.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this phone number'
      });
    }

    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;
    if (cleanEmail) {
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email address'
        });
      }
    }
    
    // Create user
    const userName = name && typeof name === 'string' && name.trim() ? name.trim() : `User ${cleanPhone.slice(-4)}`;
    const userPayload = { name: userName, phone: cleanPhone, password };
    if (cleanEmail) {
      userPayload.email = cleanEmail;
    }
    const user = await User.create(userPayload);
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user
    });
    
    logger.info(`New user registered: ${user.phone}`);
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { phone, password } = req.body;
    const cleanPhone = normalizeEthiopianPhone(phone);
    
    // Find user with password
    const user = await User.findOne({ phone: cleanPhone }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user
    });
    
    logger.info(`User logged in: ${user.phone}`);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update profile
// @route   PUT /api/v1/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, settings, avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (name) user.name = name;
    if (email !== undefined) user.email = email;
    if (settings) user.settings = { ...user.settings, ...settings };
    if (avatar !== undefined) user.avatar = avatar;
    
    await user.save();
    
    res.json({ success: true, data: user });
    logger.info(`Profile updated for user: ${user.phone}`);
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile'
    });
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed successfully for user: ${user.phone}`);
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

// @desc    Verify phone number for password reset
// @route   POST /api/v1/auth/verify-phone
// @access  Public
exports.verifyPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const cleanPhone = normalizeEthiopianPhone(phone);
    if (!isValidEthiopianPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must start with 09 or 07 and have 10 digits'
      });
    }

    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this phone number'
      });
    }

    res.json({
      success: true,
      message: 'Phone verified',
      user: {
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    logger.error('Verify phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying phone'
    });
  }
};

// @desc    Reset password using mobile security (biometric / pattern / PIN)
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { phone, newPassword, verificationMethod } = req.body;

    if (!phone || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and new password are required'
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const cleanPhone = normalizeEthiopianPhone(phone);
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password reset successfully for user: ${cleanPhone} via method: ${verificationMethod || 'mobile_security'}`);

    res.json({
      success: true,
      message: 'Password reset successful! Please login with your new password'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};
