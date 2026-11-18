import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUser() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return { id: user._id || user.id, name: user.name || 'User', phone: user.phone || '' };
}

export const friendService = {
  getFriends: async () => {
    const user = await getLocalUser();
    const rows = await query('SELECT * FROM friends WHERE user_id = ? ORDER BY friend_name ASC;', [user.id]);

    const friendsWithBalance = await Promise.all(
      rows.map(async (f) => {
        // Debts between user and this friend
        const owedToUser = await queryOne(
          'SELECT SUM(amount) as total FROM debts WHERE to_user_id = ? AND from_user_id = ? AND is_settled = 0;',
          [user.id, f.friend_user_id || f.id]
        );
        const userOwes = await queryOne(
          'SELECT SUM(amount) as total FROM debts WHERE from_user_id = ? AND to_user_id = ? AND is_settled = 0;',
          [user.id, f.friend_user_id || f.id]
        );

        const balance = (owedToUser?.total || 0) - (userOwes?.total || 0);

        return {
          _id: f.id,
          id: f.id,
          name: f.friend_name,
          phone: f.friend_phone,
          avatar: f.friend_avatar,
          balance,
        };
      })
    );

    return { success: true, data: friendsWithBalance };
  },

  getPendingRequests: async () => {
    const user = await getLocalUser();
    const rows = await query(
      'SELECT * FROM friend_requests WHERE to_phone = ? AND status = "pending" ORDER BY created_at DESC;',
      [user.phone]
    );

    const requests = rows.map((r) => ({
      _id: r.id,
      id: r.id,
      fromUser: {
        _id: r.from_user_id,
        name: r.from_user_name,
        phone: r.from_user_phone,
      },
      createdAt: r.created_at,
    }));

    return { success: true, data: requests };
  },

  sendFriendRequest: async (phone, message = '') => {
    const user = await getLocalUser();
    const cleanPhone = phone.trim();

    // Check if friend already added
    const existing = await queryOne('SELECT id FROM friends WHERE user_id = ? AND friend_phone = ?;', [user.id, cleanPhone]);
    if (existing) throw new Error('This contact is already in your friends list');

    const id = generateId();
    const friendUserId = generateId();
    const now = new Date().toISOString();

    // In local-only mode, adding a contact directly creates the local friend entry
    await withTransaction(async () => {
      await execute(
        `INSERT INTO friends (id, user_id, friend_user_id, friend_name, friend_phone, net_balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?);`,
        [id, user.id, friendUserId, cleanPhone, cleanPhone, now, now]
      );

      await execute(
        `INSERT INTO friend_requests (id, from_user_id, from_user_name, from_user_phone, to_phone, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'accepted', ?);`,
        [generateId(), user.id, user.name, user.phone, cleanPhone, now]
      );
    });

    return { success: true, message: 'Friend added to your device' };
  },

  acceptFriendRequest: async (requestId) => {
    const user = await getLocalUser();
    const req = await queryOne('SELECT * FROM friend_requests WHERE id = ?;', [requestId]);
    if (!req) throw new Error('Request not found');

    const now = new Date().toISOString();

    await withTransaction(async () => {
      await execute('UPDATE friend_requests SET status = "accepted" WHERE id = ?;', [requestId]);
      await execute(
        `INSERT INTO friends (id, user_id, friend_user_id, friend_name, friend_phone, net_balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?);`,
        [generateId(), user.id, req.from_user_id, req.from_user_name, req.from_user_phone, now, now]
      );
    });

    return { success: true };
  },

  rejectFriendRequest: async (requestId) => {
    await execute('UPDATE friend_requests SET status = "rejected" WHERE id = ?;', [requestId]);
    return { success: true };
  },

  removeFriend: async (friendId) => {
    const user = await getLocalUser();
    await execute('DELETE FROM friends WHERE id = ? AND user_id = ?;', [friendId, user.id]);
    return { success: true };
  },
};

export default friendService;
