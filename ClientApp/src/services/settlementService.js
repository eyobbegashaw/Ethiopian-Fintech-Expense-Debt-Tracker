import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUser() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return { id: user._id || user.id, name: user.name || 'User' };
}

export const settlementService = {
  createSettlement: async (settlementData) => {
    const user = await getLocalUser();
    const {
      groupId = null,
      toUser,
      amount,
      paymentMethod = 'telebirr',
      transactionReference = '',
      notes = '',
      date = new Date(),
    } = settlementData;

    const toUserId = toUser?._id || toUser?.id || toUser;
    const settleAmount = Number(amount);
    const id = generateId();
    const now = new Date().toISOString();
    const settleDate = new Date(date).toISOString();

    await withTransaction(async () => {
      // 1. Insert into debt_settlements
      await execute(
        `INSERT INTO debt_settlements 
         (id, group_id, from_user_id, to_user_id, amount, currency, payment_method, transaction_reference, settlement_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, 'ETB', ?, ?, ?, ?, ?);`,
        [id, groupId, user.id, toUserId, settleAmount, paymentMethod, transactionReference, settleDate, notes, now]
      );

      // 2. Mark matching unsettled debts as settled
      if (groupId) {
        await execute(
          'UPDATE debts SET is_settled = 1, updated_at = ? WHERE group_id = ? AND from_user_id = ? AND to_user_id = ? AND is_settled = 0;',
          [now, groupId, user.id, toUserId]
        );
      } else {
        await execute(
          'UPDATE debts SET is_settled = 1, updated_at = ? WHERE from_user_id = ? AND to_user_id = ? AND is_settled = 0;',
          [now, user.id, toUserId]
        );
      }
    });

    return {
      success: true,
      data: {
        _id: id,
        id,
        amount: settleAmount,
        paymentMethod,
      },
    };
  },

  getGroupSettlements: async (groupId) => {
    const rows = await query(
      'SELECT * FROM debt_settlements WHERE group_id = ? ORDER BY settlement_date DESC;',
      [groupId]
    );

    const settlements = await Promise.all(
      rows.map(async (s) => {
        const fromMember = await queryOne('SELECT member_name FROM group_members WHERE group_id = ? AND user_id = ?;', [groupId, s.from_user_id]);
        const toMember = await queryOne('SELECT member_name FROM group_members WHERE group_id = ? AND user_id = ?;', [groupId, s.to_user_id]);

        return {
          _id: s.id,
          id: s.id,
          amount: s.amount,
          currency: s.currency,
          paymentMethod: s.payment_method,
          transactionReference: s.transaction_reference,
          date: s.settlement_date,
          fromUser: { _id: s.from_user_id, name: fromMember?.member_name || 'Member' },
          toUser: { _id: s.to_user_id, name: toMember?.member_name || 'Member' },
        };
      })
    );

    return { success: true, data: settlements };
  },

  getUserBalances: async () => {
    const user = await getLocalUser();

    // Money others owe to the user
    const owedRows = await query(
      `SELECT from_user_id, from_user_name, SUM(amount) as total 
       FROM debts 
       WHERE to_user_id = ? AND is_settled = 0 
       GROUP BY from_user_id;`,
      [user.id]
    );

    // Money user owes to others
    const debtRows = await query(
      `SELECT to_user_id, to_user_name, SUM(amount) as total 
       FROM debts 
       WHERE from_user_id = ? AND is_settled = 0 
       GROUP BY to_user_id;`,
      [user.id]
    );

    let youAreOwed = 0;
    owedRows.forEach((r) => { youAreOwed += r.total; });

    let youOwe = 0;
    debtRows.forEach((r) => { youOwe += r.total; });

    // Net pairwise balances
    const pairwiseMap = {};

    owedRows.forEach((r) => {
      pairwiseMap[r.from_user_id] = {
        userId: r.from_user_id,
        name: r.from_user_name,
        amount: r.total, // positive: they owe user
      };
    });

    debtRows.forEach((r) => {
      if (pairwiseMap[r.to_user_id]) {
        pairwiseMap[r.to_user_id].amount -= r.total;
      } else {
        pairwiseMap[r.to_user_id] = {
          userId: r.to_user_id,
          name: r.to_user_name,
          amount: -r.total, // negative: user owes them
        };
      }
    });

    const netBalances = Object.values(pairwiseMap).filter((item) => Math.abs(item.amount) > 0.01);

    return {
      success: true,
      data: {
        youAreOwed,
        youOwe,
        netBalance: youAreOwed - youOwe,
        balances: netBalances,
      },
    };
  },

  getPaymentOptions: async (groupId, targetUserId) => {
    return {
      success: true,
      data: {
        paymentMethods: ['telebirr', 'cbe_birr', 'amole', 'bank_transfer', 'cash'],
      },
    };
  },

  getSettlementById: async (settlementId) => {
    const row = await queryOne('SELECT * FROM debt_settlements WHERE id = ?;', [settlementId]);
    if (!row) throw new Error('Settlement not found');
    return { success: true, data: row };
  },

  updateSettlement: async (settlementId, settlementData) => {
    const { amount, paymentMethod, transactionReference, notes } = settlementData;
    await execute(
      `UPDATE debt_settlements SET
        amount = COALESCE(?, amount),
        payment_method = COALESCE(?, payment_method),
        transaction_reference = COALESCE(?, transaction_reference),
        notes = COALESCE(?, notes)
       WHERE id = ?;`,
      [amount, paymentMethod, transactionReference, notes, settlementId]
    );
    return { success: true };
  },

  deleteSettlement: async (settlementId) => {
    await execute('DELETE FROM debt_settlements WHERE id = ?;', [settlementId]);
    return { success: true };
  },
};

export default settlementService;
