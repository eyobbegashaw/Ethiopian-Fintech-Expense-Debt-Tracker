import { query } from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

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
    // default this_month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

export const reportService = {
  getOverview: async (params = {}) => {
    const userId = await getLocalUserId();
    const { period = 'this_month', startDate, endDate, accountId } = params;
    const { start, end } = getPeriodRange(period, startDate, endDate);

    let baseFilter = 'WHERE user_id = ? AND date >= ? AND date <= ?';
    const filterParams = [userId, start, end];

    if (accountId) {
      baseFilter += ' AND account_id = ?';
      filterParams.push(accountId);
    }

    // 1. Total income & expense (Excluding transfers!)
    const incomeExpenseRows = await query(
      `SELECT type, SUM(amount) as total, COUNT(*) as count 
       FROM account_transactions 
       ${baseFilter} AND type IN ('income', 'expense')
       GROUP BY type;`,
      filterParams
    );

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    incomeExpenseRows.forEach((r) => {
      if (r.type === 'income') {
        totalIncome = r.total;
        incomeCount = r.count;
      }
      if (r.type === 'expense') {
        totalExpense = r.total;
        expenseCount = r.count;
      }
    });

    const netCashFlow = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 && netCashFlow > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;

    const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
    const avgDailyExpense = Math.round((totalExpense / days) * 100) / 100;

    // 2. Category spending
    const catRows = await query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count 
       FROM account_transactions 
       ${baseFilter} AND type = 'expense'
       GROUP BY category ORDER BY total DESC;`,
      filterParams
    );

    const categorySpending = catRows.map((r) => ({
      category: r.category,
      total: r.total,
      count: r.count,
      percentage: totalExpense > 0 ? Math.round((r.total / totalExpense) * 100) : 0,
    }));

    // 3. Spending by account
    const accRows = await query(
      `SELECT fa.name as accountName, fa.type as accountType, fa.color as color, SUM(t.amount) as total, COUNT(*) as count
       FROM account_transactions t
       JOIN financial_accounts fa ON t.account_id = fa.id
       ${baseFilter} AND t.type = 'expense'
       GROUP BY t.account_id ORDER BY total DESC;`,
      filterParams
    );

    return {
      success: true,
      data: {
        period,
        summary: {
          totalIncome,
          totalExpense,
          netCashFlow,
          savingsRate,
          avgDailyExpense,
          incomeCount,
          expenseCount,
        },
        categorySpending,
        accountSpending: accRows,
      },
    };
  },

  exportData: async () => {
    const userId = await getLocalUserId();
    const rows = await query(
      `SELECT t.*, fa.name as account_name, tfa.name as to_account_name
       FROM account_transactions t
       LEFT JOIN financial_accounts fa ON t.account_id = fa.id
       LEFT JOIN financial_accounts tfa ON t.to_account_id = tfa.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC;`,
      [userId]
    );

    const exportRows = rows.map((r) => ({
      id: r.id,
      date: r.date,
      type: r.type,
      category: r.category,
      description: r.description,
      amount: r.amount,
      currency: r.currency,
      account: r.account_name || '',
      toAccount: r.to_account_name || '',
      counterparty: r.counterparty || '',
      source: r.source,
      reference: r.reference_number || '',
    }));

    return {
      success: true,
      count: exportRows.length,
      data: exportRows,
    };
  },
};

export default reportService;
