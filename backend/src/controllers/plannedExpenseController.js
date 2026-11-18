const PlannedExpense = require('../models/PlannedExpense');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const logger = require('../utils/logger');

// Helper to compute next recurrence due date
function getNextDueDate(currentDueDate, recurrence) {
  const d = new Date(currentDueDate);
  if (recurrence === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (recurrence === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (recurrence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (recurrence === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

// @desc    Get planned expenses (filter: all, upcoming, paid, overdue)
// @route   GET /api/v1/planned-expenses
// @access  Private
exports.getPlannedExpenses = async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const now = new Date();

    const query = { userId: req.user._id };

    if (status === 'upcoming') {
      query.isPaid = false;
      query.dueDate = { $gte: now };
    } else if (status === 'overdue') {
      query.isPaid = false;
      query.dueDate = { $lt: now };
    } else if (status === 'paid') {
      query.isPaid = true;
    }

    const plannedExpenses = await PlannedExpense.find(query)
      .populate('accountId', 'name type currency color icon')
      .populate('paidTransactionId')
      .sort({ isPaid: 1, dueDate: 1 });

    const totalUpcoming = plannedExpenses
      .filter((p) => !p.isPaid)
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      count: plannedExpenses.length,
      totalUpcoming,
      data: plannedExpenses,
    });
  } catch (error) {
    logger.error('Error fetching planned expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching planned expenses',
      error: error.message,
    });
  }
};

// @desc    Create planned expense
// @route   POST /api/v1/planned-expenses
// @access  Private
exports.createPlannedExpense = async (req, res) => {
  try {
    const {
      title,
      amount,
      category,
      dueDate,
      accountId,
      recurrence = 'none',
      reminderDaysBefore = 2,
      notes,
    } = req.body;

    if (!title || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, amount, and due date are required',
      });
    }

    const plannedAmount = Number(amount);
    if (isNaN(plannedAmount) || plannedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    const plannedExpense = await PlannedExpense.create({
      userId: req.user._id,
      title,
      amount: plannedAmount,
      category: category || 'Utilities',
      dueDate: new Date(dueDate),
      accountId: accountId || null,
      recurrence,
      reminderDaysBefore: Number(reminderDaysBefore) || 2,
      notes: notes || '',
    });

    const populated = await PlannedExpense.findById(plannedExpense._id)
      .populate('accountId', 'name type currency color icon');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    logger.error('Error creating planned expense:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating planned expense',
      error: error.message,
    });
  }
};

// @desc    Mark planned expense as paid (creates actual expense and deducts account balance)
// @route   POST /api/v1/planned-expenses/:id/pay
// @access  Private
exports.markAsPaid = async (req, res) => {
  try {
    const plannedExpense = await PlannedExpense.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plannedExpense) {
      return res.status(404).json({
        success: false,
        message: 'Planned expense not found',
      });
    }

    if (plannedExpense.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'This expense is already marked as paid',
      });
    }

    const { accountId, paidDate = new Date() } = req.body;
    const targetAccountId = accountId || plannedExpense.accountId;

    if (!targetAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Payment account is required to mark this expense as paid',
      });
    }

    const account = await Account.findOne({
      _id: targetAccountId,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Selected payment account not found',
      });
    }

    // Deduct from account balance now (NOT prematurely)
    account.balance = (account.balance || 0) - plannedExpense.amount;
    await account.save();

    // Create actual expense Transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: 'expense',
      accountId: account._id,
      amount: plannedExpense.amount,
      currency: account.currency,
      category: plannedExpense.category || 'Other Expense',
      description: `Bill Paid: ${plannedExpense.title}`,
      date: new Date(paidDate),
      source: 'recurring',
      plannedExpenseId: plannedExpense._id,
      notes: plannedExpense.notes || '',
    });

    plannedExpense.isPaid = true;
    plannedExpense.paidDate = new Date(paidDate);
    plannedExpense.paidTransactionId = transaction._id;
    plannedExpense.accountId = account._id;
    await plannedExpense.save();

    // If recurring, automatically create next scheduled instance
    let nextScheduled = null;
    if (plannedExpense.recurrence && plannedExpense.recurrence !== 'none') {
      const nextDue = getNextDueDate(plannedExpense.dueDate, plannedExpense.recurrence);
      nextScheduled = await PlannedExpense.create({
        userId: req.user._id,
        title: plannedExpense.title,
        amount: plannedExpense.amount,
        currency: plannedExpense.currency,
        category: plannedExpense.category,
        dueDate: nextDue,
        accountId: plannedExpense.accountId,
        recurrence: plannedExpense.recurrence,
        reminderDaysBefore: plannedExpense.reminderDaysBefore,
        notes: plannedExpense.notes,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense marked as paid and balance updated',
      data: {
        plannedExpense,
        transaction,
        nextScheduled,
      },
    });
  } catch (error) {
    logger.error('Error marking planned expense as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing payment',
      error: error.message,
    });
  }
};

// @desc    Update planned expense
// @route   PUT /api/v1/planned-expenses/:id
// @access  Private
exports.updatePlannedExpense = async (req, res) => {
  try {
    const plannedExpense = await PlannedExpense.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plannedExpense) {
      return res.status(404).json({
        success: false,
        message: 'Planned expense not found',
      });
    }

    const { title, amount, category, dueDate, accountId, recurrence, reminderDaysBefore, notes } = req.body;

    if (title) plannedExpense.title = title;
    if (amount !== undefined && Number(amount) > 0) plannedExpense.amount = Number(amount);
    if (category) plannedExpense.category = category;
    if (dueDate) plannedExpense.dueDate = new Date(dueDate);
    if (accountId !== undefined) plannedExpense.accountId = accountId || null;
    if (recurrence) plannedExpense.recurrence = recurrence;
    if (reminderDaysBefore !== undefined) plannedExpense.reminderDaysBefore = Number(reminderDaysBefore);
    if (notes !== undefined) plannedExpense.notes = notes;

    await plannedExpense.save();

    res.status(200).json({
      success: true,
      data: plannedExpense,
    });
  } catch (error) {
    logger.error('Error updating planned expense:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating planned expense',
      error: error.message,
    });
  }
};

// @desc    Delete planned expense
// @route   DELETE /api/v1/planned-expenses/:id
// @access  Private
exports.deletePlannedExpense = async (req, res) => {
  try {
    const plannedExpense = await PlannedExpense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plannedExpense) {
      return res.status(404).json({
        success: false,
        message: 'Planned expense not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Planned expense deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting planned expense:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting planned expense',
      error: error.message,
    });
  }
};
