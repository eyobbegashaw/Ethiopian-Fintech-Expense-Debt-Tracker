const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const logger = require('../utils/logger');

// @desc    Get transactions with filtering & pagination
// @route   GET /api/v1/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const {
      type,
      accountId,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { userId: req.user._id };

    if (type) {
      query.type = type;
    }

    if (accountId) {
      query.$or = [{ accountId }, { toAccountId: accountId }];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { counterparty: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('accountId', 'name type currency color icon')
        .populate('toAccountId', 'name type currency color icon')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(query),
    ]);

    // Calculate totals for current filter (excluding transfers from income/expense)
    const summaryAgg = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    summaryAgg.forEach((item) => {
      if (item._id === 'income') totalIncome = item.totalAmount;
      if (item._id === 'expense') totalExpense = item.totalAmount;
    });

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
      summary: {
        totalIncome,
        totalExpense,
        netCashFlow: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions',
      error: error.message,
    });
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/v1/transactions/:id
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate('accountId', 'name type currency color icon')
      .populate('toAccountId', 'name type currency color icon');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction',
      error: error.message,
    });
  }
};

// @desc    Create a new transaction (Income or Expense)
// @route   POST /api/v1/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const {
      type,
      accountId,
      amount,
      category,
      description,
      counterparty,
      date,
      source = 'manual',
      receipt,
      notes,
    } = req.body;

    if (!type || !accountId || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: 'Type, account, amount, and description are required',
      });
    }

    const txAmount = Number(amount);
    if (isNaN(txAmount) || txAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    const account = await Account.findOne({
      _id: accountId,
      userId: req.user._id,
      isArchived: false,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Update account balance
    if (type === 'income') {
      account.balance = (account.balance || 0) + txAmount;
    } else if (type === 'expense') {
      account.balance = (account.balance || 0) - txAmount;
    }

    await account.save();

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      accountId: account._id,
      amount: txAmount,
      currency: account.currency,
      category: category || (type === 'income' ? 'Other Income' : 'Other Expense'),
      description,
      counterparty: counterparty || '',
      date: date ? new Date(date) : new Date(),
      source,
      receipt: receipt || null,
      notes: notes || '',
    });

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('accountId', 'name type currency color icon');

    res.status(201).json({
      success: true,
      data: populatedTx,
      updatedAccountBalance: account.balance,
    });
  } catch (error) {
    logger.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating transaction',
      error: error.message,
    });
  }
};

// @desc    Update a transaction
// @route   PUT /api/v1/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const {
      amount,
      accountId,
      category,
      description,
      counterparty,
      date,
      receipt,
      notes,
    } = req.body;

    const oldAmount = transaction.amount;
    const oldAccountId = transaction.accountId.toString();
    const newAmount = amount !== undefined ? Number(amount) : oldAmount;
    const targetAccountId = accountId || oldAccountId;

    // Adjust balance if amount or account changed
    if (transaction.type !== 'transfer') {
      if (targetAccountId === oldAccountId) {
        const diff = newAmount - oldAmount;
        if (diff !== 0) {
          const account = await Account.findById(oldAccountId);
          if (account) {
            if (transaction.type === 'income') {
              account.balance = (account.balance || 0) + diff;
            } else if (transaction.type === 'expense') {
              account.balance = (account.balance || 0) - diff;
            }
            await account.save();
          }
        }
      } else {
        // Revert old account balance
        const oldAccount = await Account.findById(oldAccountId);
        if (oldAccount) {
          if (transaction.type === 'income') oldAccount.balance -= oldAmount;
          if (transaction.type === 'expense') oldAccount.balance += oldAmount;
          await oldAccount.save();
        }
        // Apply to new account
        const newAccount = await Account.findById(targetAccountId);
        if (newAccount) {
          if (transaction.type === 'income') newAccount.balance += newAmount;
          if (transaction.type === 'expense') newAccount.balance -= newAmount;
          await newAccount.save();
        }
      }
    }

    if (newAmount > 0) transaction.amount = newAmount;
    if (accountId) transaction.accountId = accountId;
    if (category) transaction.category = category;
    if (description) transaction.description = description;
    if (counterparty !== undefined) transaction.counterparty = counterparty;
    if (date) transaction.date = new Date(date);
    if (receipt !== undefined) transaction.receipt = receipt;
    if (notes !== undefined) transaction.notes = notes;

    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('accountId', 'name type currency color icon')
      .populate('toAccountId', 'name type currency color icon');

    res.status(200).json({
      success: true,
      data: populatedTx,
    });
  } catch (error) {
    logger.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating transaction',
      error: error.message,
    });
  }
};

// @desc    Delete a transaction and revert account balance
// @route   DELETE /api/v1/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Revert account balances
    if (transaction.type === 'income') {
      const account = await Account.findById(transaction.accountId);
      if (account) {
        account.balance = (account.balance || 0) - transaction.amount;
        await account.save();
      }
    } else if (transaction.type === 'expense') {
      const account = await Account.findById(transaction.accountId);
      if (account) {
        account.balance = (account.balance || 0) + transaction.amount;
        await account.save();
      }
    } else if (transaction.type === 'transfer') {
      const fromAccount = await Account.findById(transaction.accountId);
      const toAccount = await Account.findById(transaction.toAccountId);
      if (fromAccount) {
        fromAccount.balance = (fromAccount.balance || 0) + transaction.amount;
        await fromAccount.save();
      }
      if (toAccount) {
        toAccount.balance = (toAccount.balance || 0) - transaction.amount;
        await toAccount.save();
      }
    }

    await Transaction.deleteOne({ _id: transaction._id });

    res.status(200).json({
      success: true,
      message: 'Transaction deleted and account balance updated',
    });
  } catch (error) {
    logger.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting transaction',
      error: error.message,
    });
  }
};

// @desc    Get financial dashboard summary
// @route   GET /api/v1/transactions/summary
// @access  Private
exports.getTransactionSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Current month income & expense
    const currentMonthAgg = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startOfCurrentMonth },
          type: { $in: ['income', 'expense'] },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    currentMonthAgg.forEach((item) => {
      if (item._id === 'income') currentMonthIncome = item.total;
      if (item._id === 'expense') currentMonthExpense = item.total;
    });

    // Last month income & expense
    const lastMonthAgg = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          type: { $in: ['income', 'expense'] },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let lastMonthIncome = 0;
    let lastMonthExpense = 0;
    lastMonthAgg.forEach((item) => {
      if (item._id === 'income') lastMonthIncome = item.total;
      if (item._id === 'expense') lastMonthExpense = item.total;
    });

    // Category-wise spending for current month
    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startOfCurrentMonth },
          type: 'expense',
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Total accounts balance (net worth)
    const accounts = await Account.find({ userId: req.user._id, isArchived: false });
    const totalWealth = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Recent 5 transactions
    const recentTransactions = await Transaction.find({ userId: req.user._id })
      .populate('accountId', 'name type currency color icon')
      .populate('toAccountId', 'name type currency color icon')
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalWealth,
        currentMonth: {
          income: currentMonthIncome,
          expense: currentMonthExpense,
          netCashFlow: currentMonthIncome - currentMonthExpense,
        },
        lastMonth: {
          income: lastMonthIncome,
          expense: lastMonthExpense,
        },
        categorySpending,
        recentTransactions,
      },
    });
  } catch (error) {
    logger.error('Error fetching transaction summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching summary',
      error: error.message,
    });
  }
};
