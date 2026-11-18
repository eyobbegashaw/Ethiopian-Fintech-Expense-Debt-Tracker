import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

function getNextDueDate(currentDueDateStr, recurrence) {
  const d = new Date(currentDueDateStr);
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (recurrence === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export const plannedExpenseService = {
  getPlannedExpenses: async (params = {}) => {
    const userId = await getLocalUserId();
    const { status = 'all' } = params;
    const now = new Date().toISOString();

    let sql = `
      SELECT p.*, fa.name as account_name, fa.color as account_color, fa.icon as account_icon
      FROM planned_expenses p
      LEFT JOIN financial_accounts fa ON p.account_id = fa.id
      WHERE p.user_id = ?
    `;
    const sqlParams = [userId];

    if (status === 'upcoming') {
      sql += ' AND p.is_paid = 0 AND p.due_date >= ?';
      sqlParams.push(now);
    } else if (status === 'overdue') {
      sql += ' AND p.is_paid = 0 AND p.due_date < ?';
      sqlParams.push(now);
    } else if (status === 'paid') {
      sql += ' AND p.is_paid = 1';
    }

    sql += ' ORDER BY p.is_paid ASC, p.due_date ASC;';
    const rows = await query(sql, sqlParams);

    const plannedExpenses = rows.map((r) => ({
      _id: r.id,
      id: r.id,
      title: r.title,
      amount: r.amount,
      currency: r.currency,
      category: r.category,
      dueDate: r.due_date,
      recurrence: r.recurrence,
      reminderDaysBefore: r.reminder_days_before,
      isPaid: Boolean(r.is_paid),
      paidDate: r.paid_date,
      notes: r.notes,
      accountId: r.account_id ? {
        _id: r.account_id,
        name: r.account_name,
        color: r.account_color,
        icon: r.account_icon,
      } : null,
    }));

    const totalUpcoming = plannedExpenses
      .filter((p) => !p.isPaid)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      success: true,
      count: plannedExpenses.length,
      totalUpcoming,
      data: plannedExpenses,
    };
  },

  createPlannedExpense: async (data) => {
    const userId = await getLocalUserId();
    const {
      title,
      amount,
      category = 'Utilities',
      dueDate,
      accountId = null,
      recurrence = 'none',
      reminderDaysBefore = 2,
      notes = '',
      currency = 'ETB',
    } = data;

    const id = generateId();
    const now = new Date().toISOString();
    const dueIso = new Date(dueDate).toISOString();

    await execute(
      `INSERT INTO planned_expenses 
       (id, user_id, account_id, title, amount, currency, category, due_date, recurrence, reminder_days_before, is_paid, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
      [id, userId, accountId, title, Number(amount), currency, category, dueIso, recurrence, Number(reminderDaysBefore), notes, now, now]
    );

    return {
      success: true,
      data: { _id: id, id, title, amount, dueDate: dueIso },
    };
  },

  markAsPaid: async (id, data = {}) => {
    const userId = await getLocalUserId();
    const bill = await queryOne('SELECT * FROM planned_expenses WHERE id = ? AND user_id = ?;', [id, userId]);
    if (!bill) throw new Error('Planned bill not found');
    if (bill.is_paid) throw new Error('This bill is already marked as paid');

    const targetAccountId = data.accountId || bill.account_id;
    if (!targetAccountId) throw new Error('Payment account is required');

    const account = await queryOne('SELECT * FROM financial_accounts WHERE id = ? AND user_id = ?;', [targetAccountId, userId]);
    if (!account) throw new Error('Selected payment account not found');

    const txId = generateId();
    const now = new Date().toISOString();
    const paidDate = data.paidDate ? new Date(data.paidDate).toISOString() : now;

    await withTransaction(async () => {
      // 1. Deduct from account balance
      await execute('UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;', [bill.amount, now, targetAccountId]);

      // 2. Insert into account_transactions
      await execute(
        `INSERT INTO account_transactions 
         (id, user_id, account_id, type, amount, currency, category, description, date, source, is_verified, status, planned_expense_id, created_at, updated_at)
         VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, ?, 'recurring', 1, 'confirmed', ?, ?, ?);`,
        [txId, userId, targetAccountId, bill.amount, bill.currency, bill.category, `Bill Paid: ${bill.title}`, paidDate, id, now, now]
      );

      // 3. Insert into expense_records
      await execute(
        `INSERT INTO expense_records (id, user_id, account_id, amount, currency, category, merchant, date, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?);`,
        [generateId(), userId, targetAccountId, bill.amount, bill.currency, bill.category, bill.title, paidDate, bill.notes, now, now]
      );

      // 4. Mark planned bill as paid
      await execute(
        'UPDATE planned_expenses SET is_paid = 1, paid_date = ?, paid_transaction_id = ?, account_id = ?, updated_at = ? WHERE id = ?;',
        [paidDate, txId, targetAccountId, now, id]
      );

      // 5. If recurring, automatically schedule next bill
      if (bill.recurrence && bill.recurrence !== 'none') {
        const nextDue = getNextDueDate(bill.due_date, bill.recurrence);
        await execute(
          `INSERT INTO planned_expenses 
           (id, user_id, account_id, title, amount, currency, category, due_date, recurrence, reminder_days_before, is_paid, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
          [generateId(), userId, targetAccountId, bill.title, bill.amount, bill.currency, bill.category, nextDue, bill.recurrence, bill.reminder_days_before, bill.notes, now, now]
        );
      }
    });

    return {
      success: true,
      message: 'Bill marked as paid and balance updated',
    };
  },

  updatePlannedExpense: async (id, data) => {
    const userId = await getLocalUserId();
    const now = new Date().toISOString();
    const { title, amount, category, dueDate, recurrence, notes } = data;

    await execute(
      `UPDATE planned_expenses SET
        title = COALESCE(?, title),
        amount = COALESCE(?, amount),
        category = COALESCE(?, category),
        due_date = COALESCE(?, due_date),
        recurrence = COALESCE(?, recurrence),
        notes = COALESCE(?, notes),
        updated_at = ?
       WHERE id = ? AND user_id = ?;`,
      [
        title,
        amount !== undefined ? Number(amount) : null,
        category,
        dueDate ? new Date(dueDate).toISOString() : null,
        recurrence,
        notes,
        now,
        id,
        userId,
      ]
    );

    return { success: true };
  },

  deletePlannedExpense: async (id) => {
    const userId = await getLocalUserId();
    await execute('DELETE FROM planned_expenses WHERE id = ? AND user_id = ?;', [id, userId]);
    return { success: true, message: 'Planned bill deleted' };
  },
};

export default plannedExpenseService;
