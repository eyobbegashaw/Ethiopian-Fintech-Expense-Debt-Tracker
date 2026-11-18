const SavingsGoal = require('../models/SavingsGoal');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// @desc    Get all savings goals with progress calculations
// @route   GET /api/v1/savings-goals
// @access  Private
exports.getSavingsGoals = async (req, res) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user._id })
      .populate('accountId', 'name type currency color icon')
      .sort({ isCompleted: 1, createdAt: -1 });

    const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

    const goalsWithProgress = goals.map((goal) => {
      const percentage = goal.targetAmount > 0
        ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
        : 0;

      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

      let daysRemaining = null;
      if (goal.targetDate) {
        const diff = new Date(goal.targetDate).getTime() - new Date().getTime();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      return {
        ...goal.toObject(),
        percentage,
        remaining,
        daysRemaining,
      };
    });

    res.status(200).json({
      success: true,
      count: goalsWithProgress.length,
      totalSaved,
      totalTarget,
      overallProgress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
      data: goalsWithProgress,
    });
  } catch (error) {
    logger.error('Error fetching savings goals:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching savings goals',
      error: error.message,
    });
  }
};

// @desc    Create savings goal
// @route   POST /api/v1/savings-goals
// @access  Private
exports.createSavingsGoal = async (req, res) => {
  try {
    const {
      title,
      targetAmount,
      currentAmount = 0,
      currency = 'ETB',
      targetDate,
      accountId,
      category,
      icon,
      color,
    } = req.body;

    if (!title || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: 'Goal title and target amount are required',
      });
    }

    const target = Number(targetAmount);
    if (isNaN(target) || target <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target amount must be greater than 0',
      });
    }

    const current = Number(currentAmount) || 0;

    const goal = await SavingsGoal.create({
      userId: req.user._id,
      title,
      targetAmount: target,
      currentAmount: current,
      currency,
      targetDate: targetDate ? new Date(targetDate) : null,
      accountId: accountId || null,
      category: category || 'Emergency Fund',
      icon: icon || 'piggy-bank',
      color: color || '#2E7D32',
      isCompleted: current >= target,
      history: current > 0 ? [{ type: 'deposit', amount: current, note: 'Initial savings' }] : [],
    });

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    logger.error('Error creating savings goal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating savings goal',
      error: error.message,
    });
  }
};

// @desc    Deposit funds into a savings goal
// @route   POST /api/v1/savings-goals/:id/deposit
// @access  Private
exports.depositToGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    const { amount, note, sourceAccountId } = req.body;
    const depositAmount = Number(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Deposit amount must be greater than 0',
      });
    }

    // If source account specified, deduct from account
    if (sourceAccountId) {
      const account = await Account.findOne({
        _id: sourceAccountId,
        userId: req.user._id,
      });
      if (account) {
        account.balance = (account.balance || 0) - depositAmount;
        await account.save();
      }
    }

    goal.currentAmount = (goal.currentAmount || 0) + depositAmount;
    if (goal.currentAmount >= goal.targetAmount) {
      goal.isCompleted = true;
    }

    goal.history.push({
      type: 'deposit',
      amount: depositAmount,
      date: new Date(),
      note: note || 'Deposit',
    });

    await goal.save();

    res.status(200).json({
      success: true,
      message: 'Deposit recorded successfully',
      data: goal,
    });
  } catch (error) {
    logger.error('Error recording deposit to savings goal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while depositing to goal',
      error: error.message,
    });
  }
};

// @desc    Withdraw funds from savings goal
// @route   POST /api/v1/savings-goals/:id/withdraw
// @access  Private
exports.withdrawFromGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    const { amount, note, destAccountId } = req.body;
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount must be greater than 0',
      });
    }

    if (withdrawAmount > goal.currentAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds in goal. Available: ${goal.currentAmount} ${goal.currency}`,
      });
    }

    // If destination account specified, add back to account
    if (destAccountId) {
      const account = await Account.findOne({
        _id: destAccountId,
        userId: req.user._id,
      });
      if (account) {
        account.balance = (account.balance || 0) + withdrawAmount;
        await account.save();
      }
    }

    goal.currentAmount = goal.currentAmount - withdrawAmount;
    if (goal.currentAmount < goal.targetAmount) {
      goal.isCompleted = false;
    }

    goal.history.push({
      type: 'withdraw',
      amount: withdrawAmount,
      date: new Date(),
      note: note || 'Withdrawal',
    });

    await goal.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal recorded successfully',
      data: goal,
    });
  } catch (error) {
    logger.error('Error recording withdrawal from savings goal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while withdrawing from goal',
      error: error.message,
    });
  }
};

// @desc    Update savings goal
// @route   PUT /api/v1/savings-goals/:id
// @access  Private
exports.updateSavingsGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    const { title, targetAmount, targetDate, accountId, category, icon, color } = req.body;

    if (title) goal.title = title;
    if (targetAmount !== undefined && Number(targetAmount) > 0) {
      goal.targetAmount = Number(targetAmount);
      goal.isCompleted = goal.currentAmount >= goal.targetAmount;
    }
    if (targetDate !== undefined) goal.targetDate = targetDate ? new Date(targetDate) : null;
    if (accountId !== undefined) goal.accountId = accountId || null;
    if (category) goal.category = category;
    if (icon) goal.icon = icon;
    if (color) goal.color = color;

    await goal.save();

    res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    logger.error('Error updating savings goal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating goal',
      error: error.message,
    });
  }
};

// @desc    Delete savings goal
// @route   DELETE /api/v1/savings-goals/:id
// @access  Private
exports.deleteSavingsGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Savings goal deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting savings goal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting goal',
      error: error.message,
    });
  }
};
