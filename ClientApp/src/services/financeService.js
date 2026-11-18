import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

export const financeService = {
  getTransactions: async (params = {}) => {
    const userId = await getLocalUserId();
    const { type, accountId, category, startDate, endDate, search, limit = 50, page = 1 } = params;

    let sql = `
      SELECT t.*, 
             fa.name as account_name, fa.type as account_type, fa.color as account_color, fa.icon as account_icon, fa.currency as account_currency,
             tfa.name as to_account_name, tfa.type as to_account_type
      FROM account_transactions t
      LEFT JOIN financial_accounts fa ON t.account_id = fa.id
      LEFT JOIN financial_accounts tfa ON t.to_account_id = tfa.id
      WHERE t.user_id = ?
    `;
    const sqlParams = [userId];

    if (type) {
      sql += ' AND t.type = ?';
      sqlParams.push(type);
    }
    if (accountId) {
      sql += ' AND (t.account_id = ? OR t.to_account_id = ?)';
      sqlParams.push(accountId, accountId);
    }
    if (category && category !== 'All' && category !== 'All Categories') {
      sql += ' AND t.category = ?';
      sqlParams.push(category);
    }
    if (startDate) {
      sql += ' AND t.date >= ?';
      sqlParams.push(new Date(startDate).toISOString());
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sql += ' AND t.date <= ?';
      sqlParams.push(end.toISOString());
    }
    if (search) {
      sql += ' AND (t.description LIKE ? OR t.counterparty LIKE ? OR t.category LIKE ?)';
      sqlParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';

    const offset = (page - 1) * limit;
    const pagedSql = `${sql} LIMIT ? OFFSET ?;`;
    const rows = await query(pagedSql, [...sqlParams, limit, offset]);

    const transactions = rows.map((r) => ({
      _id: r.id,
      id: r.id,
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      category: r.category,
      description: r.description,
      counterparty: r.counterparty,
      date: r.date,
      source: r.source,
      referenceNumber: r.reference_number,
      isVerified: Boolean(r.is_verified),
      status: r.status,
      receipt: r.receipt_uri,
      notes: r.notes,
      accountId: {
        _id: r.account_id,
        name: r.account_name,
        type: r.account_type,
        color: r.account_color,
        icon: r.account_icon,
        currency: r.account_currency,
      },
      toAccountId: r.to_account_id ? {
        _id: r.to_account_id,
        name: r.to_account_name,
        type: r.to_account_type,
      } : null,
    }));

    // Summary calculation (transfers excluded from income/expense)
    const summaryRows = await query(
      `SELECT type, SUM(amount) as total
       FROM account_transactions
       WHERE user_id = ? AND type IN ('income', 'expense')
       GROUP BY type;`,
      [userId]
    );

    let totalIncome = 0;
    let totalExpense = 0;
    summaryRows.forEach((r) => {
      if (r.type === 'income') totalIncome = r.total;
      if (r.type === 'expense') totalExpense = r.total;
    });

    return {
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total: transactions.length,
        pages: 1,
      },
      summary: {
        totalIncome,
        totalExpense,
        netCashFlow: totalIncome - totalExpense,
      },
    };
  },

  getTransactionById: async (id) => {
    const userId = await getLocalUserId();
    const r = await queryOne(
      `SELECT t.*, 
              fa.name as account_name, fa.type as account_type, fa.color as account_color, fa.icon as account_icon,
              tfa.name as to_account_name, tfa.type as to_account_type
       FROM account_transactions t
       LEFT JOIN financial_accounts fa ON t.account_id = fa.id
       LEFT JOIN financial_accounts tfa ON t.to_account_id = tfa.id
       WHERE t.id = ? AND t.user_id = ?;`,
      [id, userId]
    );

    if (!r) throw new Error('Transaction not found');

    return {
      success: true,
      data: {
        _id: r.id,
        id: r.id,
        type: r.type,
        amount: r.amount,
        currency: r.currency,
        category: r.category,
        description: r.description,
        counterparty: r.counterparty,
        date: r.date,
        source: r.source,
        notes: r.notes,
        receipt: r.receipt_uri,
        accountId: {
          _id: r.account_id,
          name: r.account_name,
          type: r.account_type,
          color: r.account_color,
          icon: r.account_icon,
        },
      },
    };
  },

  createTransaction: async (data) => {
    const userId = await getLocalUserId();
    const {
      type,
      accountId,
      amount,
      category,
      description,
      counterparty = '',
      date = new Date(),
      source = 'manual',
      receipt = null,
      notes = '',
      plannedExpenseId = null,
    } = data;

    const txAmount = Number(amount);
    if (!type || !accountId || isNaN(txAmount) || txAmount <= 0 || !description) {
      throw new Error('Valid type, account, amount, and description are required');
    }

    const account = await queryOne('SELECT * FROM financial_accounts WHERE id = ? AND user_id = ?;', [accountId, userId]);
    if (!account) throw new Error('Account not found');

    const txId = generateId();
    const now = new Date().toISOString();
    const txDate = new Date(date).toISOString();

    await withTransaction(async () => {
      // 1. Insert into account_transactions
      await execute(
        `INSERT INTO account_transactions 
         (id, user_id, account_id, type, amount, currency, category, description, counterparty, date, source, is_verified, status, receipt_uri, notes, planned_expense_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'confirmed', ?, ?, ?, ?, ?);`,
        [
          txId,
          userId,
          accountId,
          type,
          txAmount,
          account.currency,
          category || (type === 'income' ? 'Other Income' : 'Other Expense'),
          description,
          counterparty,
          txDate,
          source,
          receipt,
          notes,
          plannedExpenseId,
          now,
          now,
        ]
      );

      // 2. Insert into income_records or expense_records table
      if (type === 'income') {
        await execute(
          `INSERT INTO income_records (id, user_id, account_id, amount, currency, category, source_name, date, receipt_uri, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [generateId(), userId, accountId, txAmount, account.currency, category, counterparty, txDate, receipt, notes, now, now]
        );
        // Credit account
        await execute('UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;', [txAmount, now, accountId]);
      } else if (type === 'expense') {
        await execute(
          `INSERT INTO expense_records (id, user_id, account_id, amount, currency, category, merchant, date, receipt_uri, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?);`,
          [generateId(), userId, accountId, txAmount, account.currency, category, counterparty, txDate, receipt, notes, now, now]
        );
        // Debit account
        await execute('UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;', [txAmount, now, accountId]);
      }
    });

    return {
      success: true,
      data: {
        _id: txId,
        id: txId,
        type,
        amount: txAmount,
        description,
        date: txDate,
      },
    };
  },

  updateTransaction: async (id, data) => {
    const userId = await getLocalUserId();
    const oldTx = await queryOne('SELECT * FROM account_transactions WHERE id = ? AND user_id = ?;', [id, userId]);
    if (!oldTx) throw new Error('Transaction not found');

    const now = new Date().toISOString();
    const newAmount = data.amount !== undefined ? Number(data.amount) : oldTx.amount;
    const targetAccountId = data.accountId || oldTx.account_id;

    await withTransaction(async () => {
      // Balance adjustments
      if (oldTx.type !== 'transfer') {
        if (targetAccountId === oldTx.account_id) {
          const diff = newAmount - oldTx.amount;
          if (diff !== 0) {
            const operator = oldTx.type === 'income' ? '+' : '-';
            await execute(
              `UPDATE financial_accounts SET current_balance = current_balance ${operator} ?, updated_at = ? WHERE id = ?;`,
              [diff, now, oldTx.account_id]
            );
          }
        } else {
          // Revert old account
          const revertOp = oldTx.type === 'income' ? '-' : '+';
          await execute(
            `UPDATE financial_accounts SET current_balance = current_balance ${revertOp} ?, updated_at = ? WHERE id = ?;`,
            [oldTx.amount, now, oldTx.account_id]
          );
          // Apply to new account
          const applyOp = oldTx.type === 'income' ? '+' : '-';
          await execute(
            `UPDATE financial_accounts SET current_balance = current_balance ${applyOp} ?, updated_at = ? WHERE id = ?;`,
            [newAmount, now, targetAccountId]
          );
        }
      }

      await execute(
        `UPDATE account_transactions SET
          amount = ?,
          account_id = ?,
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          counterparty = COALESCE(?, counterparty),
          date = COALESCE(?, date),
          notes = COALESCE(?, notes),
          updated_at = ?
         WHERE id = ? AND user_id = ?;`,
        [
          newAmount,
          targetAccountId,
          data.category,
          data.description,
          data.counterparty,
          data.date ? new Date(data.date).toISOString() : null,
          data.notes,
          now,
          id,
          userId,
        ]
      );
    });

    return { success: true };
  },

  deleteTransaction: async (id) => {
    const userId = await getLocalUserId();
    const tx = await queryOne('SELECT * FROM account_transactions WHERE id = ? AND user_id = ?;', [id, userId]);
    if (!tx) throw new Error('Transaction not found');

    const now = new Date().toISOString();

    await withTransaction(async () => {
      // Revert account balances
      if (tx.type === 'income') {
        await execute('UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;', [tx.amount, now, tx.account_id]);
      } else if (tx.type === 'expense') {
        await execute('UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;', [tx.amount, now, tx.account_id]);
      } else if (tx.type === 'transfer') {
        await execute('UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;', [tx.amount, now, tx.account_id]);
        if (tx.to_account_id) {
          await execute('UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;', [tx.amount, now, tx.to_account_id]);
        }
      }

      await execute('DELETE FROM account_transactions WHERE id = ? AND user_id = ?;', [id, userId]);
      await execute('DELETE FROM income_records WHERE user_id = ? AND account_id = ? AND amount = ? AND date = ?;', [userId, tx.account_id, tx.amount, tx.date]);
      await execute('DELETE FROM expense_records WHERE user_id = ? AND account_id = ? AND amount = ? AND date = ?;', [userId, tx.account_id, tx.amount, tx.date]);
    });

    return { success: true, message: 'Transaction deleted successfully' };
  },

  getTransactionSummary: async () => {
    const userId = await getLocalUserId();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Accounts balance (Total wealth)
    const accRows = await query('SELECT current_balance FROM financial_accounts WHERE user_id = ? AND is_archived = 0;', [userId]);
    const totalWealth = accRows.reduce((sum, r) => sum + (r.current_balance || 0), 0);

    // Current month income & expense
    const currentMonthRows = await query(
      `SELECT type, SUM(amount) as total
       FROM account_transactions
       WHERE user_id = ? AND date >= ? AND type IN ('income', 'expense')
       GROUP BY type;`,
      [userId, startOfMonth]
    );

    let monthIncome = 0;
    let monthExpense = 0;
    currentMonthRows.forEach((r) => {
      if (r.type === 'income') monthIncome = r.total;
      if (r.type === 'expense') monthExpense = r.total;
    });

    // Recent 5 transactions
    const recentRows = await query(
      `SELECT t.*, fa.name as account_name, fa.type as account_type, fa.color as account_color, fa.icon as account_icon
       FROM account_transactions t
       LEFT JOIN financial_accounts fa ON t.account_id = fa.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC, t.created_at DESC LIMIT 5;`,
      [userId]
    );

    const recentTransactions = recentRows.map((r) => ({
      _id: r.id,
      id: r.id,
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      category: r.category,
      description: r.description,
      date: r.date,
      accountId: {
        _id: r.account_id,
        name: r.account_name,
        type: r.account_type,
        color: r.account_color,
        icon: r.account_icon,
      },
    }));

    // Category spending
    const categorySpending = await query(
      `SELECT category as _id, SUM(amount) as total, COUNT(*) as count
       FROM account_transactions
       WHERE user_id = ? AND date >= ? AND type = 'expense'
       GROUP BY category ORDER BY total DESC;`,
      [userId, startOfMonth]
    );

    return {
      success: true,
      data: {
        totalWealth,
        currentMonth: {
          income: monthIncome,
          expense: monthExpense,
          netCashFlow: monthIncome - monthExpense,
        },
        categorySpending,
        recentTransactions,
      },
    };
  },
};

export default financeService;
