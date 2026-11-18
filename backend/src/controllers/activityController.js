const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// @desc    Get user activity and in-app notification feed
// @route   GET /api/v1/activities
exports.getActivities = async (req, res) => {
  try {
    const { filter = 'all', page = 1, limit = 50 } = req.query;

    // Find all groups user belongs to
    const groups = await Group.find({ 'members.userId': req.user.id }).select('_id name');
    const groupIds = groups.map(g => g._id);
    const groupNameMap = groups.reduce((acc, g) => {
      acc[g._id.toString()] = g.name;
      return acc;
    }, {});

    let items = [];

    // Fetch user in-app notifications
    if (filter === 'all' || filter === 'notifications') {
      const notifications = await Notification.find({ recipient: req.user.id })
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      notifications.forEach(notif => {
        items.push({
          _id: notif._id,
          type: notif.type || 'general',
          description: notif.message,
          title: notif.title,
          amount: notif.data?.amount,
          groupId: notif.data?.groupId,
          groupName: notif.data?.groupName || 'In-App Notification',
          user: {
            name: notif.sender?.name || 'System',
            avatar: notif.sender?.avatar
          },
          createdAt: notif.createdAt,
          isNotification: true,
          isRead: notif.isRead
        });
      });
    }

    // Fetch expenses
    if (filter === 'all' || filter === 'expenses') {
      const expenses = await Expense.find({ groupId: { $in: groupIds } })
        .populate('paidBy', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      expenses.forEach(exp => {
        items.push({
          _id: exp._id,
          type: 'expense',
          description: exp.description,
          amount: exp.amount,
          groupId: exp.groupId,
          groupName: groupNameMap[exp.groupId.toString()] || 'Group',
          user: {
            name: exp.paidBy?.name || 'Unknown',
            avatar: exp.paidBy?.avatar
          },
          createdAt: exp.createdAt
        });
      });
    }

    // Fetch settlements
    if (filter === 'all' || filter === 'settlements') {
      const settlements = await Settlement.find({ groupId: { $in: groupIds } })
        .populate('fromUser', 'name avatar')
        .populate('toUser', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      settlements.forEach(st => {
        items.push({
          _id: st._id,
          type: 'settlement',
          description: `Paid via ${st.method}`,
          amount: st.amount,
          groupId: st.groupId,
          groupName: groupNameMap[st.groupId.toString()] || 'Group',
          user: {
            name: st.fromUser?.name || 'Unknown',
            avatar: st.fromUser?.avatar
          },
          createdAt: st.createdAt
        });
      });
    }

    // Sort by createdAt desc
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + parseInt(limit));

    res.status(200).json({
      success: true,
      data: paginatedItems,
      total: items.length
    });
  } catch (error) {
    logger.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving activities'
    });
  }
};

// @desc    Get group activities
// @route   GET /api/v1/activities/group/:groupId
exports.getGroupActivities = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const [expenses, settlements] = await Promise.all([
      Expense.find({ groupId })
        .populate('paidBy', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit)),
      Settlement.find({ groupId })
        .populate('fromUser', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
    ]);

    const items = [
      ...expenses.map(e => ({
        _id: e._id,
        type: 'expense',
        description: e.description,
        amount: e.amount,
        groupId: e.groupId,
        groupName: group.name,
        user: { name: e.paidBy?.name || 'Unknown', avatar: e.paidBy?.avatar },
        createdAt: e.createdAt
      })),
      ...settlements.map(s => ({
        _id: s._id,
        type: 'settlement',
        description: `Paid via ${s.method}`,
        amount: s.amount,
        groupId: s.groupId,
        groupName: group.name,
        user: { name: s.fromUser?.name || 'Unknown', avatar: s.fromUser?.avatar },
        createdAt: s.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: items.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error('Get group activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving group activities'
    });
  }
};

// @desc    Get user specific activities
// @route   GET /api/v1/activities/user/:userId
exports.getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const [expenses, settlements] = await Promise.all([
      Expense.find({ paidBy: userId })
        .populate('paidBy', 'name avatar')
        .populate('groupId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit)),
      Settlement.find({ $or: [{ fromUser: userId }, { toUser: userId }] })
        .populate('fromUser', 'name avatar')
        .populate('groupId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
    ]);

    const items = [
      ...expenses.map(e => ({
        _id: e._id,
        type: 'expense',
        description: e.description,
        amount: e.amount,
        groupId: e.groupId?._id || e.groupId,
        groupName: e.groupId?.name || 'Group',
        user: { name: e.paidBy?.name || 'Unknown', avatar: e.paidBy?.avatar },
        createdAt: e.createdAt
      })),
      ...settlements.map(s => ({
        _id: s._id,
        type: 'settlement',
        description: `Paid via ${s.method}`,
        amount: s.amount,
        groupId: s.groupId?._id || s.groupId,
        groupName: s.groupId?.name || 'Group',
        user: { name: s.fromUser?.name || 'Unknown', avatar: s.fromUser?.avatar },
        createdAt: s.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: items.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error('Get user activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving user activities'
    });
  }
};
