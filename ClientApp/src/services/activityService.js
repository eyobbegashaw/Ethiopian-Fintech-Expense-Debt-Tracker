import { query } from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

export const activityService = {
  getActivities: async (filter = 'all', page = 1, limit = 50) => {
    const userId = await getLocalUserId();

    // 1. Group expenses
    const expRows = await query(
      `SELECT ge.id, ge.description, ge.amount, ge.currency, ge.date, ge.category, ge.paid_by_name, g.name as group_name
       FROM group_expenses ge
       JOIN groups g ON ge.group_id = g.id
       ORDER BY ge.date DESC LIMIT ?;`,
      [limit]
    );

    // 2. Personal transactions
    const txRows = await query(
      `SELECT t.id, t.type, t.description, t.amount, t.currency, t.date, t.category, fa.name as account_name
       FROM account_transactions t
       LEFT JOIN financial_accounts fa ON t.account_id = fa.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC LIMIT ?;`,
      [userId, limit]
    );

    // 3. Settlements
    const setRows = await query(
      `SELECT s.id, s.amount, s.currency, s.settlement_date as date, s.payment_method
       FROM debt_settlements s
       WHERE s.from_user_id = ? OR s.to_user_id = ?
       ORDER BY s.settlement_date DESC LIMIT ?;`,
      [userId, userId, limit]
    );

    const combined = [];

    expRows.forEach((e) => {
      combined.push({
        _id: e.id,
        id: e.id,
        type: 'expense_added',
        title: `${e.paid_by_name} added "${e.description}"`,
        description: `Amount: ${e.amount} ${e.currency} in ${e.group_name}`,
        date: e.date,
        createdAt: e.date,
        icon: 'cash-minus',
        color: '#D32F2F',
      });
    });

    txRows.forEach((t) => {
      combined.push({
        _id: t.id,
        id: t.id,
        type: t.type === 'income' ? 'income_recorded' : 'personal_expense',
        title: t.description,
        description: `${t.type === 'income' ? '+' : '-'}${t.amount} ${t.currency} (${t.account_name || 'Account'})`,
        date: t.date,
        createdAt: t.date,
        icon: t.type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle',
        color: t.type === 'income' ? '#2E7D32' : '#D32F2F',
      });
    });

    setRows.forEach((s) => {
      combined.push({
        _id: s.id,
        id: s.id,
        type: 'settlement',
        title: `Settled ${s.amount} ${s.currency}`,
        description: `Via ${s.payment_method.toUpperCase()}`,
        date: s.date,
        createdAt: s.date,
        icon: 'hand-coin',
        color: '#1976D2',
      });
    });

    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      data: combined.slice(0, limit),
    };
  },

  getGroupActivities: async (groupId, page = 1, limit = 50) => {
    const expRows = await query(
      `SELECT ge.id, ge.description, ge.amount, ge.currency, ge.date, ge.paid_by_name
       FROM group_expenses ge
       WHERE ge.group_id = ?
       ORDER BY ge.date DESC LIMIT ?;`,
      [groupId, limit]
    );

    return {
      success: true,
      data: expRows.map((e) => ({
        _id: e.id,
        title: `${e.paid_by_name} paid ${e.amount} ${e.currency}`,
        description: e.description,
        date: e.date,
        createdAt: e.date,
      })),
    };
  },

  getUserActivities: async (userId, page = 1, limit = 50) => {
    return activityService.getActivities('all', page, limit);
  },
};

export default activityService;
