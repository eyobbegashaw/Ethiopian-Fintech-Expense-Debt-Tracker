import { query, execute, withTransaction } from '../database/db';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

export const backupService = {
  /**
   * Export all local database records for current user
   */
  exportBackup: async (password = '') => {
    const userId = await getLocalUserId();

    const [
      user,
      profile,
      accounts,
      transactions,
      income,
      expenses,
      groups,
      groupMembers,
      groupExpenses,
      debts,
      settlements,
      friends,
      budgets,
      plannedExpenses,
      savingsGoals,
      savingsContributions,
      smsTransactions,
    ] = await Promise.all([
      query('SELECT * FROM users WHERE id = ?;', [userId]),
      query('SELECT * FROM user_profiles WHERE user_id = ?;', [userId]),
      query('SELECT * FROM financial_accounts WHERE user_id = ?;', [userId]),
      query('SELECT * FROM account_transactions WHERE user_id = ?;', [userId]),
      query('SELECT * FROM income_records WHERE user_id = ?;', [userId]),
      query('SELECT * FROM expense_records WHERE user_id = ?;', [userId]),
      query('SELECT * FROM groups WHERE created_by = ?;', [userId]),
      query('SELECT * FROM group_members WHERE group_id IN (SELECT id FROM groups WHERE created_by = ?);', [userId]),
      query('SELECT * FROM group_expenses WHERE group_id IN (SELECT id FROM groups WHERE created_by = ?);', [userId]),
      query('SELECT * FROM debts WHERE from_user_id = ? OR to_user_id = ?;', [userId, userId]),
      query('SELECT * FROM debt_settlements WHERE from_user_id = ? OR to_user_id = ?;', [userId, userId]),
      query('SELECT * FROM friends WHERE user_id = ?;', [userId]),
      query('SELECT * FROM budgets WHERE user_id = ?;', [userId]),
      query('SELECT * FROM planned_expenses WHERE user_id = ?;', [userId]),
      query('SELECT * FROM savings_goals WHERE user_id = ?;', [userId]),
      query('SELECT * FROM savings_contributions WHERE goal_id IN (SELECT id FROM savings_goals WHERE user_id = ?);', [userId]),
      query('SELECT * FROM sms_imported_transactions WHERE user_id = ?;', [userId]),
    ]);

    const backupData = {
      app: 'እልፍ',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      userId,
      data: {
        user: user[0] || null,
        profile: profile[0] || null,
        accounts,
        transactions,
        income,
        expenses,
        groups,
        groupMembers,
        groupExpenses,
        debts,
        settlements,
        friends,
        budgets,
        plannedExpenses,
        savingsGoals,
        savingsContributions,
        smsTransactions,
      },
    };

    const rawJson = JSON.stringify(backupData);
    const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawJson);

    return {
      backupJson: JSON.stringify({ ...backupData, checksum }),
      summary: {
        accountsCount: accounts.length,
        transactionsCount: transactions.length,
        groupsCount: groups.length,
        debtsCount: debts.length,
        savingsGoalsCount: savingsGoals.length,
        exportedAt: backupData.timestamp,
      },
    };
  },

  /**
   * Validate and preview backup file without overwriting
   */
  validateBackup: async (backupJsonString) => {
    try {
      const parsed = JSON.parse(backupJsonString);
      if (!parsed.data || (parsed.app !== 'እልፍ' && parsed.app !== 'Ethio Debt Tracker')) {
        throw new Error('Invalid backup file format');
      }

      const { checksum, ...contentWithoutChecksum } = parsed;
      const expectedChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(contentWithoutChecksum)
      );

      return {
        isValid: true,
        isChecksumValid: checksum === expectedChecksum,
        summary: {
          accountsCount: parsed.data.accounts?.length || 0,
          transactionsCount: parsed.data.transactions?.length || 0,
          groupsCount: parsed.data.groups?.length || 0,
          debtsCount: parsed.data.debts?.length || 0,
          timestamp: parsed.timestamp,
        },
        payload: parsed,
      };
    } catch (err) {
      return { isValid: false, error: err.message };
    }
  },

  /**
   * Restore local database from validated backup
   */
  restoreBackup: async (backupPayload) => {
    const { data } = backupPayload;
    if (!data) throw new Error('No data found in backup payload');

    const targetUserId = data.user?.id || (await getLocalUserId());

    await withTransaction(async () => {
      // Restore accounts
      if (data.accounts?.length) {
        for (const a of data.accounts) {
          await execute(
            `INSERT OR REPLACE INTO financial_accounts 
             (id, user_id, name, type, institution, account_number, initial_balance, current_balance, currency, color, icon, is_default, is_archived, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [a.id, targetUserId, a.name, a.type, a.institution, a.account_number, a.initial_balance, a.current_balance, a.currency, a.color, a.icon, a.is_default, a.is_archived, a.notes, a.created_at, a.updated_at]
          );
        }
      }

      // Restore transactions
      if (data.transactions?.length) {
        for (const t of data.transactions) {
          await execute(
            `INSERT OR REPLACE INTO account_transactions 
             (id, user_id, account_id, to_account_id, type, amount, currency, category, description, counterparty, date, source, reference_number, is_verified, status, receipt_uri, notes, planned_expense_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [t.id, targetUserId, t.account_id, t.to_account_id, t.type, t.amount, t.currency, t.category, t.description, t.counterparty, t.date, t.source, t.reference_number, t.is_verified, t.status, t.receipt_uri, t.notes, t.planned_expense_id, t.created_at, t.updated_at]
          );
        }
      }

      // Restore groups
      if (data.groups?.length) {
        for (const g of data.groups) {
          await execute(
            `INSERT OR REPLACE INTO groups 
             (id, name, type, description, currency, created_by, simplify_debts, icon, banner, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [g.id, g.name, g.type, g.description, g.currency, targetUserId, g.simplify_debts, g.icon, g.banner, g.created_at, g.updated_at]
          );
        }
      }

      // Restore debts
      if (data.debts?.length) {
        for (const d of data.debts) {
          await execute(
            `INSERT OR REPLACE INTO debts 
             (id, group_id, expense_id, from_user_id, from_user_name, to_user_id, to_user_name, amount, currency, is_settled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [d.id, d.group_id, d.expense_id, d.from_user_id, d.from_user_name, d.to_user_id, d.to_user_name, d.amount, d.currency, d.is_settled, d.created_at, d.updated_at]
          );
        }
      }

      // Restore budgets
      if (data.budgets?.length) {
        for (const b of data.budgets) {
          await execute(
            `INSERT OR REPLACE INTO budgets 
             (id, user_id, name, category, amount, currency, period, start_date, end_date, alert_thresholds, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [b.id, targetUserId, b.name, b.category, b.amount, b.currency, b.period, b.start_date, b.end_date, b.alert_thresholds, b.is_active, b.created_at, b.updated_at]
          );
        }
      }

      // Restore savings
      if (data.savingsGoals?.length) {
        for (const s of data.savingsGoals) {
          await execute(
            `INSERT OR REPLACE INTO savings_goals 
             (id, user_id, account_id, title, target_amount, current_amount, currency, target_date, category, icon, color, is_completed, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [s.id, targetUserId, s.account_id, s.title, s.target_amount, s.current_amount, s.currency, s.target_date, s.category, s.icon, s.color, s.is_completed, s.created_at, s.updated_at]
          );
        }
      }
    });

    return { success: true, message: 'Data restored successfully' };
  },
};

export default backupService;
