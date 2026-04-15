const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  addExpense,
  getGroupExpenses,
  deleteExpense
} = require('../controllers/expenseController');

const addExpenseValidation = [
  body('groupId').isMongoId().withMessage('Valid group ID is required'),
  body('description').notEmpty().trim().escape().isLength({ min: 2, max: 200 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paidBy').isMongoId().withMessage('Valid payer ID is required'),
  body('splits').isArray({ min: 1 }).withMessage('At least one split is required'),
  body('splits.*.userId').isMongoId().withMessage('Valid user ID is required in splits'),
  body('splits.*.share').isFloat({ min: 0 }).withMessage('Share must be non-negative'),
  body('category').optional().isIn(['Food & Drink', 'Transport', 'Rent', 'Utilities', 'Shopping', 'Entertainment', 'Coffee Ceremony', 'Gift', 'Other']),
  body('notes').optional().trim().escape().isLength({ max: 500 }),
];

router.route('/')
  .post(protect, addExpenseValidation, validate, addExpense);

router.get('/group/:groupId', protect, getGroupExpenses);
router.delete('/:id', protect, deleteExpense);

module.exports = router;