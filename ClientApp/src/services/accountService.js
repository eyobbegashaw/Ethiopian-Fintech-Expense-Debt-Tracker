import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

export const accountService = {
  getAccounts: async () => {
    const userId = await getLocalUserId();
    const rows = await query(
      `SELECT * FROM financial_accounts 
       WHERE user_id = ? AND is_archived = 0 
       ORDER BY is_default DESC, created_at DESC;`,
      [userId]
    );

    const accounts = rows.map((r) => ({
      _id: r.id,
      id: r.id,
      name: r.name,
      type: r.type,
      institution: r.institution,
      accountNumber: r.account_number,
      initialBalance: r.initial_balance,
      balance: r.current_balance,
      currency: r.currency,
      color: r.color,
      icon: r.icon,
      isDefault: Boolean(r.is_default),
      isArchived: Boolean(r.is_archived),
      notes: r.notes,
      createdAt: r.created_at,
    }));

    const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

    return {
      success: true,
      count: accounts.length,
      totalBalance,
      data: accounts,
    };
  },

  getAccountById: async (id) => {
    const userId = await getLocalUserId();
    const row = await queryOne(
      'SELECT * FROM financial_accounts WHERE id = ? AND user_id = ?;',
      [id, userId]
    );

    if (!row) throw new Error('Account not found');

    const account = {
      _id: row.id,
      id: row.id,
      name: row.name,
      type: row.type,
      institution: row.institution,
      accountNumber: row.account_number,
      initialBalance: row.initial_balance,
      balance: row.current_balance,
      currency: row.currency,
      color: row.color,
      icon: row.icon,
      isDefault: Boolean(row.is_default),
      notes: row.notes,
    };

    const txRows = await query(
      `SELECT t.*, 
              fa.name as account_name, fa.type as account_type, fa.color as account_color, fa.icon as account_icon,
              tfa.name as to_account_name, tfa.type as to_account_type
       FROM account_transactions t
       LEFT JOIN financial_accounts fa ON t.account_id = fa.id
       LEFT JOIN financial_accounts tfa ON t.to_account_id = tfa.id
       WHERE t.user_id = ? AND (t.account_id = ? OR t.to_account_id = ?)
       ORDER BY t.date DESC LIMIT 20;`,
      [userId, id, id]
    );

    const recentTransactions = txRows.map((t) => ({
      _id: t.id,
      id: t.id,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      description: t.description,
      date: t.date,
      accountId: {
        _id: t.account_id,
        name: t.account_name,
        type: t.account_type,
        color: t.account_color,
        icon: t.account_icon,
      },
      toAccountId: t.to_account_id ? {
        _id: t.to_account_id,
        name: t.to_account_name,
        type: t.to_account_type,
      } : null,
    }));

    return {
      success: true,
      data: {
        account,
        recentTransactions,
      },
    };
  },

  createAccount: async (accountData) => {
    const userId = await getLocalUserId();
    const {
      name,
      type,
      institution,
      accountNumber = '',
      initialBalance = 0,
      currency = 'ETB',
      color = '#2E7D32',
      icon = 'bank',
      isDefault = false,
      notes = '',
    } = accountData;

    const id = generateId();
    const now = new Date().toISOString();
    const initBal = Number(initialBalance) || 0;

    await withTransaction(async () => {
      if (isDefault) {
        await execute('UPDATE financial_accounts SET is_default = 0 WHERE user_id = ?;', [userId]);
      }

      await execute(
        `INSERT INTO financial_accounts 
         (id, user_id, name, type, institution, account_number, initial_balance, current_balance, currency, color, icon, is_default, is_archived, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
        [id, userId, name, type, institution, accountNumber, initBal, initBal, currency, color, icon, isDefault ? 1 : 0, notes, now, now]
      );
    });

    return {
      success: true,
      data: {
        _id: id,
        id,
        name,
        type,
        institution,
        balance: initBal,
        currency,
        color,
        icon,
        isDefault,
      },
    };
  },

  updateAccount: async (id, accountData) => {
    const userId = await getLocalUserId();
    const now = new Date().toISOString();
    const { name, institution, accountNumber, color, icon, isDefault, notes, balance } = accountData;

    await withTransaction(async () => {
      if (isDefault) {
        await execute('UPDATE financial_accounts SET is_default = 0 WHERE user_id = ?;', [userId]);
      }

      await execute(
        `UPDATE financial_accounts SET 
          name = COALESCE(?, name),
          institution = COALESCE(?, institution),
          account_number = COALESCE(?, account_number),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          is_default = COALESCE(?, is_default),
          notes = COALESCE(?, notes),
          current_balance = COALESCE(?, current_balance),
          updated_at = ?
         WHERE id = ? AND user_id = ?;`,
        [
          name,
          institution,
          accountNumber,
          color,
          icon,
          isDefault !== undefined ? (isDefault ? 1 : 0) : null,
          notes,
          balance !== undefined ? Number(balance) : null,
          now,
          id,
          userId,
        ]
      );
    });

    return { success: true };
  },

  deleteAccount: async (id) => {
    const userId = await getLocalUserId();
    const tx = await queryOne(
      'SELECT id FROM account_transactions WHERE account_id = ? OR to_account_id = ? LIMIT 1;',
      [id, id]
    );

    if (tx) {
      // Archive account to keep transactions intact
      await execute('UPDATE financial_accounts SET is_archived = 1 WHERE id = ? AND user_id = ?;', [id, userId]);
      return { success: true, message: 'Account archived to preserve transaction history' };
    }

    await execute('DELETE FROM financial_accounts WHERE id = ? AND user_id = ?;', [id, userId]);
    return { success: true, message: 'Account deleted successfully' };
  },

  transferFunds: async (transferData) => {
    const userId = await getLocalUserId();
    const { fromAccountId, toAccountId, amount, notes = '', date = new Date() } = transferData;

    const transferAmount = Number(amount);
    if (!fromAccountId || !toAccountId || isNaN(transferAmount) || transferAmount <= 0) {
      throw new Error('Valid source, destination, and amount are required');
    }

    const fromAcc = await queryOne('SELECT * FROM financial_accounts WHERE id = ? AND user_id = ?;', [fromAccountId, userId]);
    const toAcc = await queryOne('SELECT * FROM financial_accounts WHERE id = ? AND user_id = ?;', [toAccountId, userId]);

    if (!fromAcc || !toAcc) throw new Error('One or both accounts were not found');

    const txId = generateId();
    const now = new Date().toISOString();
    const txDate = new Date(date).toISOString();

    await withTransaction(async () => {
      // Update balances
      await execute(
        'UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;',
        [transferAmount, now, fromAccountId]
      );
      await execute(
        'UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;',
        [transferAmount, now, toAccountId]
      );

      // Record transfer transaction
      await execute(
        `INSERT INTO account_transactions 
         (id, user_id, account_id, to_account_id, type, amount, currency, category, description, counterparty, date, source, is_verified, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'transfer', ?, ?, 'Transfer', ?, ?, ?, 'manual', 1, 'confirmed', ?, ?, ?);`,
        [
          txId,
          userId,
          fromAccountId,
          toAccountId,
          transferAmount,
          fromAcc.currency,
          `Transfer from ${fromAcc.name} to ${toAcc.name}`,
          toAcc.name,
          txDate,
          notes,
          now,
          now,
        ]
      );
    });

    return {
      success: true,
      message: 'Transfer completed successfully',
      data: { id: txId },
    };
  },
};

export default accountService;
