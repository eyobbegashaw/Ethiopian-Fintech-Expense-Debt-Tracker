const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPlannedExpenses,
  createPlannedExpense,
  markAsPaid,
  updatePlannedExpense,
  deletePlannedExpense,
} = require('../controllers/plannedExpenseController');

router.route('/')
  .get(protect, getPlannedExpenses)
  .post(protect, createPlannedExpense);

router.post('/:id/pay', protect, markAsPaid);

router.route('/:id')
  .put(protect, updatePlannedExpense)
  .delete(protect, deletePlannedExpense);

module.exports = router;
