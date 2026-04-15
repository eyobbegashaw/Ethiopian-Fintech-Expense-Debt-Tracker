const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Stricter rate limit for auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many authentication attempts, please try again later.',
});

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2 }),
  body('phone').notEmpty().withMessage('Phone number is required').matches(/^[0-9]{9,12}$/),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.get('/me', protect, getMe);
const updateProfileValidation = [
  body('name').optional().trim().escape().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email'),
];

router.put('/profile', protect, updateProfileValidation, validate, updateProfile);

module.exports = router;