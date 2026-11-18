const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addExpense,
  getGroupExpenses,
  deleteExpense,
  getExpenseById,
  updateExpense,
  markSplitAsPaid
} = require('../controllers/expenseController');

router.route('/')
  .post(protect, addExpense);

router.get('/group/:groupId', protect, getGroupExpenses);

router.route('/:id')
  .get(protect, getExpenseById)
  .put(protect, updateExpense)
  .delete(protect, deleteExpense);

router.put('/:id/splits/:userId/pay', protect, markSplitAsPaid);

module.exports = router;
