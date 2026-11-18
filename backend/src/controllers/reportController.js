const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const logger = require('../utils/logger');

function getPeriodRange(period, customStart, customEnd) {
  const now = new Date();
  let start;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (period === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
  } else {
    // Default 'this_month'
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
}

// @desc    Get detailed financial report overview
// @route   GET /api/v1/reports/overview
// @access  Private
exports.getFinancialReport = async (req, res) => {
  try {
    const { period = 'this_month', startDate, endDate, accountId } = req.query;
    const { start, end } = getPeriodRange(period, startDate, endDate);

    const matchQuery = {
      userId: req.user._id,
      date: { $gte: start, $lte: end },
    };

    if (accountId) {
      matchQuery.accountId = accountId;
    }

    // 1. Total Income and Total Expense (Excluding transfers!)
    const incomeExpenseAgg = await Transaction.aggregate([
      {
        $match: {
          ...matchQuery,
          type: { $in: ['income', 'expense'] },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    incomeExpenseAgg.forEach((item) => {
      if (item._id === 'income') {
        totalIncome = item.total;
        incomeCount = item.count;
      }
      if (item._id === 'expense') {
        totalExpense = item.total;
        expenseCount = item.count;
      }
    });

    const netCashFlow = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 && netCashFlow > 0
      ? Math.round((netCashFlow / totalIncome) * 100)
      : 0;

    const daysInPeriod = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const avgDailyExpense = Math.round((totalExpense / daysInPeriod) * 100) / 100;

    // 2. Spending breakdown by Category
    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          ...matchQuery,
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

    const formattedCategorySpending = categorySpending.map((item) => ({
      category: item._id,
      total: item.total,
      count: item.count,
      percentage: totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0,
    }));

    // 3. Income breakdown by Category
    const categoryIncome = await Transaction.aggregate([
      {
        $match: {
          ...matchQuery,
          type: 'income',
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

    // 4. Spending breakdown by Account
    const accountSpending = await Transaction.aggregate([
      {
        $match: {
          ...matchQuery,
          type: 'expense',
        },
      },
      {
        $group: {
          _id: '$accountId',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: '_id',
          foreignField: '_id',
          as: 'accountDetails',
        },
      },
      { $unwind: { path: '$accountDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          accountId: '$_id',
          accountName: { $ifNull: ['$accountDetails.name', 'Unknown Account'] },
          accountType: '$accountDetails.type',
          color: '$accountDetails.color',
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 5. Daily trend points
    const dailyTrend = await Transaction.aggregate([
      {
        $match: {
          ...matchQuery,
          type: { $in: ['income', 'expense'] },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        summary: {
          totalIncome,
          totalExpense,
          netCashFlow,
          savingsRate,
          avgDailyExpense,
          incomeCount,
          expenseCount,
        },
        categorySpending: formattedCategorySpending,
        categoryIncome,
        accountSpending,
        dailyTrend,
      },
    });
  } catch (error) {
    logger.error('Error generating financial report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating report',
      error: error.message,
    });
  }
};

// @desc    Export transactions data
// @route   GET /api/v1/reports/export
// @access  Private
exports.exportFinancialData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('accountId', 'name type')
      .populate('toAccountId', 'name type')
      .sort({ date: -1 });

    const exportRows = transactions.map((t) => ({
      id: t._id,
      date: t.date.toISOString(),
      type: t.type,
      category: t.category,
      description: t.description,
      amount: t.amount,
      currency: t.currency,
      account: t.accountId?.name || '',
      toAccount: t.toAccountId?.name || '',
      counterparty: t.counterparty || '',
      source: t.source,
      reference: t.smsReference || '',
    }));

    res.status(200).json({
      success: true,
      count: exportRows.length,
      data: exportRows,
    });
  } catch (error) {
    logger.error('Error exporting financial data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting data',
      error: error.message,
    });
  }
};
