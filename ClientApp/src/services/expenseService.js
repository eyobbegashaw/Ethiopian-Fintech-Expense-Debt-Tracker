import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUser() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return { id: user._id || user.id, name: user.name || 'User' };
}

export const expenseService = {
  addExpense: async (expenseData) => {
    const user = await getLocalUser();
    const {
      groupId,
      description,
      amount,
      paidBy,
      category = 'Other',
      splitType = 'equal',
      splits = [],
      date = new Date(),
      receipt = null,
    } = expenseData;

    const expenseId = generateId();
    const now = new Date().toISOString();
    const txDate = new Date(date).toISOString();
    const expAmount = Number(amount);

    const payerId = paidBy || user.id;

    // Payer name lookup
    const payerMember = await queryOne('SELECT member_name FROM group_members WHERE group_id = ? AND user_id = ?;', [groupId, payerId]);
    const payerName = payerMember?.member_name || (payerId === user.id ? user.name : 'Payer');

    await withTransaction(async () => {
      // 1. Insert into group_expenses
      await execute(
        `INSERT INTO group_expenses 
         (id, group_id, description, amount, currency, paid_by_user_id, paid_by_name, date, category, split_type, receipt_uri, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'ETB', ?, ?, ?, ?, ?, ?, ?, ?);`,
        [expenseId, groupId, description, expAmount, payerId, payerName, txDate, category, splitType, receipt, now, now]
      );

      // 2. Insert debts for each split participant (who isn't the payer)
      for (const split of splits) {
        const splitUserId = split.userId || split.user?._id || split.user?.id || split._id;
        const splitAmount = Number(split.share || split.amount || 0);

        if (splitUserId && splitUserId !== payerId && splitAmount > 0) {
          const splitMember = await queryOne('SELECT member_name FROM group_members WHERE group_id = ? AND user_id = ?;', [groupId, splitUserId]);
          const splitName = splitMember?.member_name || split.user?.name || 'Member';

          await execute(
            `INSERT INTO debts (id, group_id, expense_id, from_user_id, from_user_name, to_user_id, to_user_name, amount, currency, is_settled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ETB', 0, ?, ?);`,
            [generateId(), groupId, expenseId, splitUserId, splitName, payerId, payerName, splitAmount, now, now]
          );
        }
      }
    });

    return {
      success: true,
      data: {
        _id: expenseId,
        id: expenseId,
        description,
        amount: expAmount,
        groupId,
      },
    };
  },

  getGroupExpenses: async (groupId, page = 1, limit = 50, category = null) => {
    let sql = 'SELECT * FROM group_expenses WHERE group_id = ?';
    const params = [groupId];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY date DESC, created_at DESC;';
    const rows = await query(sql, params);

    const expenses = await Promise.all(
      rows.map(async (exp) => {
        const debtRows = await query('SELECT * FROM debts WHERE expense_id = ?;', [exp.id]);

        return {
          _id: exp.id,
          id: exp.id,
          groupId: exp.group_id,
          group_id: exp.group_id,
          createdBy: exp.created_by_user_id || exp.paid_by_user_id,
          description: exp.description,
          amount: exp.amount,
          currency: exp.currency,
          paidBy: {
            _id: exp.paid_by_user_id,
            id: exp.paid_by_user_id,
            name: exp.paid_by_name,
          },
          date: exp.date,
          category: exp.category,
          splitType: exp.split_type,
          splits: debtRows.map((d) => ({
            userId: d.from_user_id,
            user: { _id: d.from_user_id, id: d.from_user_id, name: d.from_user_name },
            amount: d.amount,
            isPaid: Boolean(d.is_settled),
          })),
          createdAt: exp.created_at,
        };
      })
    );

    return {
      success: true,
      data: expenses,
    };
  },

  getExpenseById: async (expenseId) => {
    const exp = await queryOne('SELECT * FROM group_expenses WHERE id = ?;', [expenseId]);
    if (!exp) throw new Error('Expense not found');

    const debtRows = await query('SELECT * FROM debts WHERE expense_id = ?;', [expenseId]);

    return {
      success: true,
      data: {
        _id: exp.id,
        id: exp.id,
        groupId: exp.group_id,
        group_id: exp.group_id,
        createdBy: exp.created_by_user_id || exp.paid_by_user_id,
        description: exp.description,
        amount: exp.amount,
        currency: exp.currency,
        paidBy: {
          _id: exp.paid_by_user_id,
          id: exp.paid_by_user_id,
          name: exp.paid_by_name,
        },
        date: exp.date,
        category: exp.category,
        splitType: exp.split_type,
        splits: debtRows.map((d) => ({
          userId: d.from_user_id,
          user: { _id: d.from_user_id, id: d.from_user_id, name: d.from_user_name },
          amount: d.amount,
          share: d.amount,
          isPaid: Boolean(d.is_settled),
        })),
        createdAt: exp.created_at,
      },
    };
  },

  updateExpense: async (expenseId, expenseData) => {
    const now = new Date().toISOString();
    const { description, amount, category, date, splits, paidBy, groupId } = expenseData;

    await withTransaction(async () => {
      await execute(
        `UPDATE group_expenses SET
          description = COALESCE(?, description),
          amount = COALESCE(?, amount),
          category = COALESCE(?, category),
          date = COALESCE(?, date),
          updated_at = ?
         WHERE id = ?;`,
        [
          description !== undefined ? description : null,
          amount !== undefined ? Number(amount) : null,
          category !== undefined ? category : null,
          date ? new Date(date).toISOString() : null,
          now,
          expenseId,
        ]
      );

      // Refresh debts if splits are passed
      if (Array.isArray(splits) && splits.length > 0) {
        await execute('DELETE FROM debts WHERE expense_id = ? AND is_settled = 0;', [expenseId]);
        const expRow = await queryOne('SELECT * FROM group_expenses WHERE id = ?;', [expenseId]);
        const payerId = paidBy || expRow?.paid_by_user_id;
        const payerName = expRow?.paid_by_name || 'Member';
        const grpId = groupId || expRow?.group_id;

        for (const s of splits) {
          const splitUserId = s.userId?._id || s.userId?.id || s.userId;
          const shareAmount = Number(s.share || s.amount) || 0;
          if (splitUserId && splitUserId !== payerId && shareAmount > 0) {
            const memberUser = await queryOne('SELECT name FROM users WHERE id = ?;', [splitUserId]);
            await execute(
              `INSERT INTO debts (id, group_id, expense_id, from_user_id, from_user_name, to_user_id, to_user_name, amount, currency, is_settled, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ETB', 0, ?, ?);`,
              [
                generateId(),
                grpId,
                expenseId,
                splitUserId,
                memberUser?.name || 'Member',
                payerId,
                payerName,
                shareAmount,
                now,
                now,
              ]
            );
          }
        }
      }
    });

    return { success: true };
  },

  deleteExpense: async (expenseId) => {
    await withTransaction(async () => {
      await execute('DELETE FROM debts WHERE expense_id = ?;', [expenseId]);
      await execute('DELETE FROM group_expenses WHERE id = ?;', [expenseId]);
    });
    return { success: true, message: 'Expense deleted successfully' };
  },

  markSplitAsPaid: async (expenseId, userId, settlementId = null) => {
    const now = new Date().toISOString();
    await execute(
      'UPDATE debts SET is_settled = 1, updated_at = ? WHERE expense_id = ? AND from_user_id = ?;',
      [now, expenseId, userId]
    );
    return { success: true };
  },
};

export default expenseService;
