const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} = require('../controllers/budgetController');

router.route('/')
  .get(protect, getBudgets)
  .post(protect, createBudget);

router.route('/:id')
  .put(protect, updateBudget)
  .delete(protect, deleteBudget);

module.exports = router;
