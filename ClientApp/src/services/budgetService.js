import { query, queryOne, execute } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

function getPeriodDates(period) {
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  } else if (period === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1).toISOString();
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString();
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
  return { start, end };
}

export const budgetService = {
  getBudgets: async () => {
    const userId = await getLocalUserId();
    const budgetRows = await query(
      'SELECT * FROM budgets WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC;',
      [userId]
    );

    const budgetsWithSpend = await Promise.all(
      budgetRows.map(async (b) => {
        const { start, end } = getPeriodDates(b.period);

        let spendSql = `
          SELECT SUM(amount) as totalSpent 
          FROM account_transactions 
          WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
        `;
        const spendParams = [userId, start, end];

        if (b.category && b.category !== 'All Categories') {
          spendSql += ' AND category = ?';
          spendParams.push(b.category);
        }

        const spendRes = await queryOne(spendSql, spendParams);
        const spent = spendRes?.totalSpent || 0;
        const remaining = Math.max(0, b.amount - spent);
        const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;

        let status = 'normal';
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'warning';
        else if (percentage >= 50) status = 'half';

        return {
          _id: b.id,
          id: b.id,
          name: b.name,
          category: b.category,
          amount: b.amount,
          currency: b.currency,
          period: b.period,
          spent,
          remaining,
          percentage,
          status,
        };
      })
    );

    return {
      success: true,
      count: budgetsWithSpend.length,
      data: budgetsWithSpend,
    };
  },

  createBudget: async (data) => {
    const userId = await getLocalUserId();
    const { name, category = 'All Categories', amount, period = 'monthly', currency = 'ETB' } = data;

    const id = generateId();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO budgets (id, user_id, name, category, amount, currency, period, start_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [id, userId, name, category, Number(amount), currency, period, now, now, now]
    );

    return {
      success: true,
      data: { id, _id: id, name, category, amount },
    };
  },

  updateBudget: async (id, data) => {
    const userId = await getLocalUserId();
    const now = new Date().toISOString();
    const { name, category, amount, period } = data;

    await execute(
      `UPDATE budgets SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        period = COALESCE(?, period),
        updated_at = ?
       WHERE id = ? AND user_id = ?;`,
      [name, category, amount !== undefined ? Number(amount) : null, period, now, id, userId]
    );

    return { success: true };
  },

  deleteBudget: async (id) => {
    const userId = await getLocalUserId();
    await execute('DELETE FROM budgets WHERE id = ? AND user_id = ?;', [id, userId]);
    return { success: true, message: 'Budget deleted successfully' };
  },
};

export default budgetService;
