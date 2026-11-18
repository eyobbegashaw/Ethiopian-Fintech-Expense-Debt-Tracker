import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import { parseFinancialSMS } from '../utils/smsParser';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

export const smsService = {
  parseSms: async (data) => {
    const { rawMessage, sender = '' } = data;
    return parseFinancialSMS(rawMessage, sender);
  },

  importSms: async (data) => {
    const userId = await getLocalUserId();
    const { rawMessage, sender = '', messages } = data;

    const list = Array.isArray(messages) ? messages : rawMessage ? [{ rawMessage, sender }] : [];
    if (list.length === 0) throw new Error('No SMS messages provided');

    const imported = [];
    const duplicates = [];
    const rejectedSecurity = [];

    const userAccounts = await query('SELECT * FROM financial_accounts WHERE user_id = ? AND is_archived = 0;', [userId]);

    for (const item of list) {
      const text = item.rawMessage || item.body || '';
      const from = item.sender || item.address || '';

      const parsed = parseFinancialSMS(text, from);

      // Strict privacy check - drop security OTPs
      if (parsed.isSecurityMessage) {
        rejectedSecurity.push(text.slice(0, 30));
        continue;
      }

      if (!parsed.amount || parsed.amount <= 0) continue;

      // Duplicate check
      if (parsed.referenceNumber) {
        const existSms = await queryOne(
          'SELECT id FROM sms_imported_transactions WHERE user_id = ? AND reference_number = ?;',
          [userId, parsed.referenceNumber]
        );
        const existTx = await queryOne(
          'SELECT id FROM account_transactions WHERE user_id = ? AND reference_number = ?;',
          [userId, parsed.referenceNumber]
        );
        if (existSms || existTx) {
          duplicates.push(parsed.referenceNumber);
          continue;
        }
      }

      // Smart match account
      let matchedAcc = userAccounts.find((a) => a.type === parsed.provider) || userAccounts[0] || null;

      const id = generateId();
      const now = new Date().toISOString();
      const txDate = item.date ? new Date(item.date).toISOString() : now;

      await execute(
        `INSERT INTO sms_imported_transactions 
         (id, user_id, raw_message, sender, provider, type, amount, currency, reference_number, transaction_date, detected_balance, counterparty, detected_category, matched_account_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?);`,
        [
          id,
          userId,
          text,
          from || 'Unknown',
          parsed.provider,
          parsed.type,
          parsed.amount,
          parsed.currency || 'ETB',
          parsed.referenceNumber,
          txDate,
          parsed.detectedBalance,
          parsed.counterparty,
          parsed.type === 'income' ? 'Other Income' : 'Other Expense',
          matchedAcc ? matchedAcc.id : null,
          now,
          now,
        ]
      );

      imported.push({ id, ...parsed });
    }

    return {
      success: true,
      importedCount: imported.length,
      duplicateCount: duplicates.length,
      rejectedSecurityCount: rejectedSecurity.length,
      data: imported,
    };
  },

  getUnverified: async () => {
    const userId = await getLocalUserId();
    const rows = await query(
      `SELECT s.*, fa.name as account_name, fa.color as account_color, fa.icon as account_icon
       FROM sms_imported_transactions s
       LEFT JOIN financial_accounts fa ON s.matched_account_id = fa.id
       WHERE s.user_id = ? AND s.status = 'unverified'
       ORDER BY s.transaction_date DESC, s.created_at DESC;`,
      [userId]
    );

    const data = rows.map((r) => ({
      _id: r.id,
      id: r.id,
      rawMessage: r.raw_message,
      sender: r.sender,
      provider: r.provider,
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      referenceNumber: r.reference_number,
      transactionDate: r.transaction_date,
      detectedBalance: r.detected_balance,
      counterparty: r.counterparty,
      detectedCategory: r.detected_category,
      status: r.status,
      matchedAccountId: r.matched_account_id ? {
        _id: r.matched_account_id,
        name: r.account_name,
        color: r.account_color,
        icon: r.account_icon,
      } : null,
    }));

    return { success: true, count: data.length, data };
  },

  confirmSms: async (id, data = {}) => {
    const userId = await getLocalUserId();
    const sms = await queryOne('SELECT * FROM sms_imported_transactions WHERE id = ? AND user_id = ?;', [id, userId]);
    if (!sms) throw new Error('SMS transaction not found');
    if (sms.status === 'confirmed') throw new Error('Transaction is already confirmed');

    const targetAccountId = data.accountId || sms.matched_account_id;
    if (!targetAccountId) throw new Error('Please select an account for this transaction');

    const account = await queryOne('SELECT * FROM financial_accounts WHERE id = ? AND user_id = ?;', [targetAccountId, userId]);
    if (!account) throw new Error('Account not found');

    const txId = generateId();
    const now = new Date().toISOString();
    const txAmount = data.amount !== undefined ? Number(data.amount) : sms.amount;
    const txType = sms.type === 'income' ? 'income' : 'expense';
    const category = data.category || sms.detected_category || (txType === 'income' ? 'Other Income' : 'Other Expense');
    const description = data.description || `SMS ${sms.provider.toUpperCase()}: ${sms.counterparty || sms.reference_number || 'Transaction'}`;

    await withTransaction(async () => {
      // 1. Update account balance
      const operator = txType === 'income' ? '+' : '-';
      await execute(`UPDATE financial_accounts SET current_balance = current_balance ${operator} ?, updated_at = ? WHERE id = ?;`, [txAmount, now, targetAccountId]);

      // 2. Insert into account_transactions
      await execute(
        `INSERT INTO account_transactions 
         (id, user_id, account_id, type, amount, currency, category, description, counterparty, date, source, reference_number, is_verified, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sms', ?, 1, 'confirmed', ?, ?);`,
        [txId, userId, targetAccountId, txType, txAmount, account.currency, category, description, sms.counterparty, sms.transaction_date, sms.reference_number, now, now]
      );

      // 3. Insert into income_records or expense_records
      if (txType === 'income') {
        await execute(
          `INSERT INTO income_records (id, user_id, account_id, amount, currency, category, source_name, date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [generateId(), userId, targetAccountId, txAmount, account.currency, category, sms.counterparty, sms.transaction_date, now, now]
        );
      } else {
        await execute(
          `INSERT INTO expense_records (id, user_id, account_id, amount, currency, category, merchant, date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?);`,
          [generateId(), userId, targetAccountId, txAmount, account.currency, category, sms.counterparty, sms.transaction_date, now, now]
        );
      }

      // 4. Update SMS record
      await execute(
        'UPDATE sms_imported_transactions SET status = "confirmed", matched_account_id = ?, updated_at = ? WHERE id = ?;',
        [targetAccountId, now, id]
      );
    });

    return { success: true, message: 'Transaction confirmed' };
  },

  rejectSms: async (id, reason = 'User rejected') => {
    const userId = await getLocalUserId();
    const now = new Date().toISOString();
    await execute(
      'UPDATE sms_imported_transactions SET status = "rejected", rejection_reason = ?, updated_at = ? WHERE id = ? AND user_id = ?;',
      [reason, now, id, userId]
    );
    return { success: true, message: 'Transaction rejected' };
  },

  deleteSms: async (id) => {
    const userId = await getLocalUserId();
    await execute('DELETE FROM sms_imported_transactions WHERE id = ? AND user_id = ?;', [id, userId]);
    return { success: true, message: 'SMS record deleted' };
  },
};

export default smsService;
