const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  createSettlement,
  getPaymentOptions,
  getGroupSettlements
} = require('../controllers/settlementController');

const createSettlementValidation = [
  body('groupId').isMongoId().withMessage('Valid group ID is required'),
  body('fromUser').isMongoId().withMessage('Valid payer ID is required'),
  body('toUser').isMongoId().withMessage('Valid receiver ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('method').isIn(['Cash', 'TeleBirr', 'CBE Birr', 'Amole', 'Bank Transfer', 'Other']).withMessage('Valid payment method is required'),
  body('transactionReference').optional().trim().escape(),
  body('notes').optional().trim().escape().isLength({ max: 500 }),
];

router.route('/')
  .post(protect, createSettlementValidation, validate, createSettlement);

router.get('/payment-options/:groupId/:userId', protect, getPaymentOptions);
router.get('/group/:groupId', protect, getGroupSettlements);

module.exports = router;