import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

export const savingsGoalService = {
  getSavingsGoals: async () => {
    const userId = await getLocalUserId();
    const rows = await query(
      `SELECT s.*, fa.name as account_name, fa.color as account_color, fa.icon as account_icon
       FROM savings_goals s
       LEFT JOIN financial_accounts fa ON s.account_id = fa.id
       WHERE s.user_id = ?
       ORDER BY s.is_completed ASC, s.created_at DESC;`,
      [userId]
    );

    const goals = rows.map((g) => {
      const percentage = g.target_amount > 0
        ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
        : 0;
      const remaining = Math.max(0, g.target_amount - g.current_amount);

      let daysRemaining = null;
      if (g.target_date) {
        const diff = new Date(g.target_date).getTime() - new Date().getTime();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      return {
        _id: g.id,
        id: g.id,
        title: g.title,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount,
        currency: g.currency,
        targetDate: g.target_date,
        category: g.category,
        icon: g.icon,
        color: g.color,
        isCompleted: Boolean(g.is_completed),
        percentage,
        remaining,
        daysRemaining,
        accountId: g.account_id ? {
          _id: g.account_id,
          name: g.account_name,
        } : null,
      };
    });

    const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

    return {
      success: true,
      count: goals.length,
      totalSaved,
      totalTarget,
      overallProgress,
      data: goals,
    };
  },

  createSavingsGoal: async (data) => {
    const userId = await getLocalUserId();
    const {
      title,
      targetAmount,
      currentAmount = 0,
      currency = 'ETB',
      targetDate = null,
      category = 'Emergency Fund',
      icon = 'piggy-bank',
      color = '#2E7D32',
    } = data;

    const target = Number(targetAmount);
    if (!title.trim() || isNaN(target) || target <= 0) {
      throw new Error('Valid title and target amount are required');
    }

    const current = Number(currentAmount) || 0;
    const id = generateId();
    const now = new Date().toISOString();
    const isCompleted = current >= target ? 1 : 0;

    await withTransaction(async () => {
      await execute(
        `INSERT INTO savings_goals 
         (id, user_id, title, target_amount, current_amount, currency, target_date, category, icon, color, is_completed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [id, userId, title, target, current, currency, targetDate ? new Date(targetDate).toISOString() : null, category, icon, color, isCompleted, now, now]
      );

      if (current > 0) {
        await execute(
          `INSERT INTO savings_contributions (id, goal_id, type, amount, currency, date, note, created_at)
           VALUES (?, ?, 'deposit', ?, ?, ?, 'Initial savings', ?);`,
          [generateId(), id, current, currency, now, now]
        );
      }
    });

    return {
      success: true,
      data: { _id: id, id, title, targetAmount: target, currentAmount: current },
    };
  },

  depositToGoal: async (id, data) => {
    const userId = await getLocalUserId();
    const { amount, note = 'Deposit', sourceAccountId = null } = data;
    const depositAmount = Number(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) throw new Error('Valid deposit amount is required');

    const goal = await queryOne('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?;', [id, userId]);
    if (!goal) throw new Error('Goal not found');

    const now = new Date().toISOString();

    await withTransaction(async () => {
      // 1. Deduct from source account if selected
      if (sourceAccountId) {
        await execute('UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;', [depositAmount, now, sourceAccountId]);
      }

      // 2. Increment goal
      const newAmount = goal.current_amount + depositAmount;
      const isCompleted = newAmount >= goal.target_amount ? 1 : 0;
      await execute(
        'UPDATE savings_goals SET current_amount = ?, is_completed = ?, updated_at = ? WHERE id = ?;',
        [newAmount, isCompleted, now, id]
      );

      // 3. Record contribution
      await execute(
        `INSERT INTO savings_contributions (id, goal_id, type, amount, currency, date, note, account_id, created_at)
         VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?, ?);`,
        [generateId(), id, depositAmount, goal.currency, now, note, sourceAccountId, now]
      );
    });

    return { success: true, message: 'Deposit recorded' };
  },

  withdrawFromGoal: async (id, data) => {
    const userId = await getLocalUserId();
    const { amount, note = 'Withdrawal', destAccountId = null } = data;
    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) throw new Error('Valid withdrawal amount is required');

    const goal = await queryOne('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?;', [id, userId]);
    if (!goal) throw new Error('Goal not found');

    if (withdrawAmount > goal.current_amount) {
      throw new Error(`Insufficient funds in goal. Available: ${goal.current_amount} ${goal.currency}`);
    }

    const now = new Date().toISOString();

    await withTransaction(async () => {
      // 1. Credit destination account if selected
      if (destAccountId) {
        await execute('UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;', [withdrawAmount, now, destAccountId]);
      }

      // 2. Decrement goal
      const newAmount = goal.current_amount - withdrawAmount;
      const isCompleted = newAmount >= goal.target_amount ? 1 : 0;
      await execute(
        'UPDATE savings_goals SET current_amount = ?, is_completed = ?, updated_at = ? WHERE id = ?;',
        [newAmount, isCompleted, now, id]
      );

      // 3. Record contribution
      await execute(
        `INSERT INTO savings_contributions (id, goal_id, type, amount, currency, date, note, account_id, created_at)
         VALUES (?, ?, 'withdraw', ?, ?, ?, ?, ?, ?);`,
        [generateId(), id, withdrawAmount, goal.currency, now, note, destAccountId, now]
      );
    });

    return { success: true, message: 'Withdrawal recorded' };
  },

  updateSavingsGoal: async (id, data) => {
    const userId = await getLocalUserId();
    const now = new Date().toISOString();
    const { title, targetAmount, targetDate, category, icon, color } = data;

    await execute(
      `UPDATE savings_goals SET
        title = COALESCE(?, title),
        target_amount = COALESCE(?, target_amount),
        target_date = COALESCE(?, target_date),
        category = COALESCE(?, category),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        updated_at = ?
       WHERE id = ? AND user_id = ?;`,
      [
        title,
        targetAmount !== undefined ? Number(targetAmount) : null,
        targetDate ? new Date(targetDate).toISOString() : null,
        category,
        icon,
        color,
        now,
        id,
        userId,
      ]
    );

    return { success: true };
  },

  deleteSavingsGoal: async (id) => {
    const userId = await getLocalUserId();
    await execute('DELETE FROM savings_goals WHERE id = ? AND user_id = ?;', [id, userId]);
    return { success: true, message: 'Savings goal deleted' };
  },
};

export default savingsGoalService;
