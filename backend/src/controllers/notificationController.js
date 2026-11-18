const notificationService = require('../services/notificationService');
const User = require('../models/User');
const Group = require('../models/Group');
const logger = require('../utils/logger');

// @desc    Get user notifications
// @route   GET /api/v1/notifications
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(req.user.id, {
      page,
      limit,
      unreadOnly
    });

    res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: {
        page: result.page,
        pages: result.pages,
        total: result.total
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving notifications'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating notification'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating notifications'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await notificationService.deleteNotification(req.params.id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification removed'
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification'
    });
  }
};

// @desc    Register or update Expo push token for app notifications
// @route   POST /api/v1/notifications/push-token
exports.updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;

    await User.findByIdAndUpdate(req.user.id, { pushToken: pushToken || null });

    res.status(200).json({
      success: true,
      message: 'Push token updated successfully'
    });
  } catch (error) {
    logger.error('Update push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating push token'
    });
  }
};

// @desc    Send in-app reminder to debtor
// @route   POST /api/v1/notifications/remind
exports.sendDebtReminder = async (req, res) => {
  try {
    const { debtorId, amount, description, groupId } = req.body;

    if (!debtorId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'debtorId and amount are required'
      });
    }

    const debtor = await User.findById(debtorId);
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Debtor user not found'
      });
    }

    let groupName = 'Shared Group';
    if (groupId) {
      const group = await Group.findById(groupId);
      if (group) groupName = group.name;
    }

    await notificationService.sendDebtReminder(
      {
        amount,
        description: description || 'outstanding debt',
        groupId,
        groupName,
        toName: req.user.name
      },
      debtor,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'In-app debt reminder sent successfully'
    });
  } catch (error) {
    logger.error('Send debt reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending reminder'
    });
  }
};
