const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// Helper to get start and end dates based on budget period
function getPeriodDates(period, customStart, customEnd) {
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else if (period === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
  // Monthly default
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// @desc    Get all budgets with calculated current spend and status
// @route   GET /api/v1/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    const budgetsWithSpend = await Promise.all(
      budgets.map(async (budget) => {
        const { start, end } = getPeriodDates(budget.period, budget.startDate, budget.endDate);

        const matchQuery = {
          userId: req.user._id,
          type: 'expense',
          date: { $gte: start, $lte: end },
        };

        if (budget.category && budget.category !== 'All Categories') {
          matchQuery.category = budget.category;
        }

        const spendAgg = await Transaction.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$amount' },
            },
          },
        ]);

        const spent = spendAgg.length > 0 ? spendAgg[0].totalSpent : 0;
        const remaining = Math.max(0, budget.amount - spent);
        const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

        let status = 'normal';
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'warning';
        else if (percentage >= 50) status = 'half';

        return {
          ...budget.toObject(),
          spent,
          remaining,
          percentage,
          status,
          periodDates: { start, end },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: budgetsWithSpend.length,
      data: budgetsWithSpend,
    });
  } catch (error) {
    logger.error('Error fetching budgets:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching budgets',
      error: error.message,
    });
  }
};

// @desc    Create a new budget
// @route   POST /api/v1/budgets
// @access  Private
exports.createBudget = async (req, res) => {
  try {
    const { name, category, amount, period = 'monthly', currency = 'ETB' } = req.body;

    if (!name || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Budget name and amount are required',
      });
    }

    const budgetAmount = Number(amount);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      name,
      category: category || 'All Categories',
      amount: budgetAmount,
      period,
      currency,
      startDate: new Date(),
    });

    res.status(201).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    logger.error('Error creating budget:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating budget',
      error: error.message,
    });
  }
};

// @desc    Update budget
// @route   PUT /api/v1/budgets/:id
// @access  Private
exports.updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    const { name, category, amount, period, isActive } = req.body;

    if (name) budget.name = name;
    if (category) budget.category = category;
    if (amount !== undefined && Number(amount) > 0) budget.amount = Number(amount);
    if (period) budget.period = period;
    if (isActive !== undefined) budget.isActive = Boolean(isActive);

    await budget.save();

    res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    logger.error('Error updating budget:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating budget',
      error: error.message,
    });
  }
};

// @desc    Delete budget
// @route   DELETE /api/v1/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting budget:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting budget',
      error: error.message,
    });
  }
};
