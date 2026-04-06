const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addExpense,
  getGroupExpenses,
  deleteExpense
} = require('../controllers/expenseController');

router.route('/')
  .post(protect, addExpense);

router.get('/group/:groupId', protect, getGroupExpenses);
router.delete('/:id', protect, deleteExpense);

module.exports = router;