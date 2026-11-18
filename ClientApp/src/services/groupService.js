import { query, queryOne, execute, withTransaction } from '../database/db';
import { generateId } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUser() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  return { id: user._id || user.id, name: user.name || 'User', phone: user.phone || '' };
}

export const groupService = {
  getGroups: async () => {
    const user = await getLocalUser();

    // Find groups created by or joined by user
    const rows = await query(
      `SELECT DISTINCT g.* 
       FROM groups g
       LEFT JOIN group_members gm ON g.id = gm.group_id
       WHERE g.created_by = ? OR gm.user_id = ?
       ORDER BY g.updated_at DESC;`,
      [user.id, user.id]
    );

    const groupsWithDetails = await Promise.all(
      rows.map(async (g) => {
        // Members
        const members = await query('SELECT * FROM group_members WHERE group_id = ?;', [g.id]);

        // Net balance for user in this group
        // Positive: others owe user. Negative: user owes others.
        const owedToUser = await queryOne(
          'SELECT SUM(amount) as total FROM debts WHERE group_id = ? AND to_user_id = ? AND is_settled = 0;',
          [g.id, user.id]
        );
        const userOwes = await queryOne(
          'SELECT SUM(amount) as total FROM debts WHERE group_id = ? AND from_user_id = ? AND is_settled = 0;',
          [g.id, user.id]
        );

        const plus = owedToUser?.total || 0;
        const minus = userOwes?.total || 0;
        const balance = plus - minus;

        return {
          _id: g.id,
          id: g.id,
          name: g.name,
          type: g.type,
          description: g.description,
          currency: g.currency,
          simplifyDebts: Boolean(g.simplify_debts),
          icon: g.icon,
          banner: g.banner,
          balance,
          members: members.map((m) => ({
            _id: m.id,
            id: m.id,
            user: { _id: m.user_id, id: m.user_id, name: m.member_name, phone: m.member_phone },
            role: m.role,
            joinedAt: m.joined_at,
          })),
          createdAt: g.created_at,
        };
      })
    );

    return {
      success: true,
      data: groupsWithDetails,
    };
  },

  getGroup: async (groupId) => {
    const user = await getLocalUser();
    const g = await queryOne('SELECT * FROM groups WHERE id = ?;', [groupId]);
    if (!g) throw new Error('Group not found');

    const members = await query('SELECT * FROM group_members WHERE group_id = ?;', [groupId]);

    const owedToUser = await queryOne(
      'SELECT SUM(amount) as total FROM debts WHERE group_id = ? AND to_user_id = ? AND is_settled = 0;',
      [groupId, user.id]
    );
    const userOwes = await queryOne(
      'SELECT SUM(amount) as total FROM debts WHERE group_id = ? AND from_user_id = ? AND is_settled = 0;',
      [groupId, user.id]
    );

    const balance = (owedToUser?.total || 0) - (userOwes?.total || 0);

    return {
      success: true,
      data: {
        _id: g.id,
        id: g.id,
        name: g.name,
        type: g.type,
        description: g.description,
        currency: g.currency,
        simplifyDebts: Boolean(g.simplify_debts),
        balance,
        members: members.map((m) => ({
          _id: m.id,
          id: m.id,
          user: { _id: m.user_id, id: m.user_id, name: m.member_name, phone: m.member_phone },
          role: m.role,
        })),
        createdAt: g.created_at,
      },
    };
  },

  createGroup: async (groupData) => {
    const user = await getLocalUser();
    const { name, type = 'other', description = '', currency = 'ETB', members = [], simplifyDebts = true } = groupData;

    const groupId = generateId();
    const now = new Date().toISOString();

    await withTransaction(async () => {
      // 1. Insert into groups
      await execute(
        `INSERT INTO groups (id, name, type, description, currency, created_by, simplify_debts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [groupId, name, type, description, currency, user.id, simplifyDebts ? 1 : 0, now, now]
      );

      // 2. Insert creator as admin member
      await execute(
        `INSERT INTO group_members (id, group_id, user_id, member_name, member_phone, role, joined_at)
         VALUES (?, ?, ?, ?, ?, 'admin', ?);`,
        [generateId(), groupId, user.id, user.name, user.phone, now]
      );

      // 3. Insert other members
      for (const m of members) {
        const memberId = m._id || m.id || m.userId;
        if (memberId && memberId !== user.id) {
          await execute(
            `INSERT INTO group_members (id, group_id, user_id, member_name, member_phone, role, joined_at)
             VALUES (?, ?, ?, ?, ?, 'member', ?);`,
            [generateId(), groupId, memberId, m.name || m.memberName || 'Member', m.phone || '', now]
          );
        }
      }
    });

    return {
      success: true,
      data: { _id: groupId, id: groupId, name, type, description },
    };
  },

  updateGroup: async (groupId, groupData) => {
    const now = new Date().toISOString();
    const { name, description, type, currency, simplifyDebts } = groupData;

    await execute(
      `UPDATE groups SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        type = COALESCE(?, type),
        currency = COALESCE(?, currency),
        simplify_debts = COALESCE(?, simplify_debts),
        updated_at = ?
       WHERE id = ?;`,
      [
        name,
        description,
        type,
        currency,
        simplifyDebts !== undefined ? (simplifyDebts ? 1 : 0) : null,
        now,
        groupId,
      ]
    );

    return { success: true };
  },

  deleteGroup: async (groupId) => {
    await withTransaction(async () => {
      await execute('DELETE FROM group_members WHERE group_id = ?;', [groupId]);
      await execute('DELETE FROM debts WHERE group_id = ?;', [groupId]);
      await execute('DELETE FROM group_expenses WHERE group_id = ?;', [groupId]);
      await execute('DELETE FROM groups WHERE id = ?;', [groupId]);
    });
    return { success: true, message: 'Group deleted successfully' };
  },

  addMember: async (groupId, userId, nickname = null) => {
    const now = new Date().toISOString();
    // Lookup member info from users or friends if available
    let memberName = nickname || 'New Member';
    let memberPhone = '';

    if (userId) {
      const u = await queryOne('SELECT name, phone FROM users WHERE id = ?;', [userId]);
      if (u) {
        memberName = nickname || u.name;
        memberPhone = u.phone;
      }
    }

    await execute(
      `INSERT INTO group_members (id, group_id, user_id, member_name, member_phone, role, joined_at)
       VALUES (?, ?, ?, ?, ?, 'member', ?);`,
      [generateId(), groupId, userId, memberName, memberPhone, now]
    );

    return { success: true };
  },

  removeMember: async (groupId, memberUserId) => {
    await execute('DELETE FROM group_members WHERE group_id = ? AND (id = ? OR user_id = ?);', [groupId, memberUserId, memberUserId]);
    return { success: true };
  },

  leaveGroup: async (groupId) => {
    const user = await getLocalUser();
    await execute('DELETE FROM group_members WHERE group_id = ? AND user_id = ?;', [groupId, user.id]);
    return { success: true };
  },

  makeAdmin: async (groupId, memberUserId) => {
    await execute('UPDATE group_members SET role = "admin" WHERE group_id = ? AND (id = ? OR user_id = ?);', [groupId, memberUserId, memberUserId]);
    return { success: true };
  },
};

export default groupService;
