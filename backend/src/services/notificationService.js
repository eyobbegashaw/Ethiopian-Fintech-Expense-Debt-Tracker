const axios = require('axios');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.io = null;
  }

  /**
   * Set Socket.io instance for real-time in-app events
   * @param {Object} io - Socket.io server instance
   */
  setIo(io) {
    this.io = io;
  }

  /**
   * Send Expo Push Notification (if token available)
   * @param {String} pushToken - Expo push token
   * @param {String} title - Notification title
   * @param {String} body - Notification body
   * @param {Object} data - Extra payload
   */
  async sendPushNotification(pushToken, title, body, data = {}) {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
      return false;
    }

    try {
      await axios.post(
        'https://exp.host/--/api/v2/push/send',
        {
          to: pushToken,
          sound: 'default',
          title,
          body,
          data
        },
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      return true;
    } catch (error) {
      logger.warn('Failed to send push notification:', error.message);
      return false;
    }
  }

  /**
   * Create and deliver in-app notification
   * @param {Object} params
   */
  async createNotification({
    recipientId,
    senderId = null,
    type = 'general',
    title,
    message,
    data = {}
  }) {
    try {
      const recipient = await User.findById(recipientId).select('settings pushToken name phone');
      if (!recipient) {
        return null;
      }

      // Check user preferences (defaults to enabled)
      const inAppEnabled = recipient.settings?.notifications?.inApp !== false;
      const pushEnabled = recipient.settings?.notifications?.push !== false;

      if (!inAppEnabled && !pushEnabled) {
        return null;
      }

      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        data
      });

      const populatedNotification = await notification.populate('sender', 'name avatar');

      // Real-time in-app socket delivery
      if (this.io && inAppEnabled) {
        this.io.to(`user_${recipientId}`).emit('new-notification', populatedNotification);
      }

      // Push notification delivery
      if (pushEnabled && recipient.pushToken) {
        await this.sendPushNotification(recipient.pushToken, title, message, {
          notificationId: notification._id.toString(),
          type,
          ...data
        });
      }

      logger.info(`In-app notification delivered to user ${recipientId}: "${title}"`);
      return populatedNotification;
    } catch (error) {
      logger.error('Failed to create in-app notification:', error.message);
      return null;
    }
  }

  /**
   * Send debt reminder
   * @param {Object} debt - Debt details
   * @param {Object} user - Debtor user
   * @param {Object} [creditor] - Creditor user
   */
  async sendDebtReminder(debt, user, creditor = null) {
    const creditorName = creditor?.name || debt.toName || 'a member';
    const title = 'Debt Reminder';
    const message = `You owe ${creditorName} ${debt.amount} ETB for ${debt.description}. Please settle soon!`;

    await this.createNotification({
      recipientId: user._id || user.id,
      senderId: creditor?._id || creditor?.id || null,
      type: 'debt_reminder',
      title,
      message,
      data: {
        amount: debt.amount,
        groupId: debt.groupId,
        groupName: debt.groupName,
        debtId: debt._id || debt.id
      }
    });

    return true;
  }

  /**
   * Send settlement confirmation
   * @param {Object} settlement - Settlement details
   * @param {Object} fromUser - Payer
   * @param {Object} toUser - Receiver
   */
  async sendSettlementConfirmation(settlement, fromUser, toUser) {
    const fromUserId = fromUser._id || fromUser.id || fromUser;
    const toUserId = toUser._id || toUser.id || toUser;
    const fromName = fromUser.name || 'User';
    const toName = toUser.name || 'User';

    // Notify payer (fromUser)
    await this.createNotification({
      recipientId: fromUserId,
      senderId: toUserId,
      type: 'settlement',
      title: 'Payment Confirmed',
      message: `You paid ${toName} ${settlement.amount} ETB via ${settlement.method}. Reference: ${settlement.transactionReference || 'N/A'}`,
      data: {
        settlementId: settlement._id,
        groupId: settlement.groupId,
        amount: settlement.amount,
        method: settlement.method
      }
    });

    // Notify receiver (toUser)
    await this.createNotification({
      recipientId: toUserId,
      senderId: fromUserId,
      type: 'settlement',
      title: 'Payment Received',
      message: `${fromName} paid you ${settlement.amount} ETB via ${settlement.method}. Reference: ${settlement.transactionReference || 'N/A'}`,
      data: {
        settlementId: settlement._id,
        groupId: settlement.groupId,
        amount: settlement.amount,
        method: settlement.method
      }
    });

    return true;
  }

  /**
   * Send expense added notification to group members
   * @param {Object} expense - Expense details
   * @param {Array} members - Group members
   */
  async sendExpenseNotification(expense, members) {
    const payerId = (expense.paidBy?._id || expense.paidBy || '').toString();
    const payerName = expense.paidByName || expense.paidBy?.name || 'A group member';
    const title = 'New Expense';
    const message = `${expense.description} for ${expense.amount} ETB was added by ${payerName}. Check your share!`;

    const promises = members.map(async (member) => {
      const memberId = (member.userId?._id || member.userId || member._id || member).toString();
      if (memberId === payerId) return;

      return this.createNotification({
        recipientId: memberId,
        senderId: payerId,
        type: 'expense',
        title,
        message,
        data: {
          expenseId: expense._id,
          groupId: expense.groupId,
          groupName: expense.groupName,
          amount: expense.amount
        }
      });
    });

    await Promise.all(promises);
    return true;
  }

  /**
   * Fetch in-app notifications for a user
   */
  async getUserNotifications(userId, { page = 1, limit = 50, unreadOnly = false } = {}) {
    const query = { recipient: userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name avatar')
        .populate('data.groupId', 'name category icon'),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false })
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId, userId) {
    return Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  }
}

module.exports = new NotificationService();
