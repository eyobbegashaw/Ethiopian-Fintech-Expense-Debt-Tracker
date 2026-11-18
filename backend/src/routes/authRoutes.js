const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe, updateProfile, verifyPhone, resetPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { normalizeEthiopianPhone, isValidEthiopianPhone } = require('../utils/phoneUtils');

const registerValidation = [
  body('name').optional({ nullable: true, checkFalsy: true }).trim(),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .customSanitizer(normalizeEthiopianPhone)
    .custom(isValidEthiopianPhone).withMessage('Phone number must start with 09 or 07 and have 10 digits (e.g. 0912345678 or 0712345678)'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .customSanitizer(normalizeEthiopianPhone)
    .custom(isValidEthiopianPhone).withMessage('Phone number must start with 09 or 07 and have 10 digits (e.g. 0912345678 or 0712345678)'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-phone', verifyPhone);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
