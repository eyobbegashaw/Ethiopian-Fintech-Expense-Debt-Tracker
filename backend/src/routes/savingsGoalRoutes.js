const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSavingsGoals,
  createSavingsGoal,
  depositToGoal,
  withdrawFromGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} = require('../controllers/savingsGoalController');

router.route('/')
  .get(protect, getSavingsGoals)
  .post(protect, createSavingsGoal);

router.post('/:id/deposit', protect, depositToGoal);
router.post('/:id/withdraw', protect, withdrawFromGoal);

router.route('/:id')
  .put(protect, updateSavingsGoal)
  .delete(protect, deleteSavingsGoal);

module.exports = router;
