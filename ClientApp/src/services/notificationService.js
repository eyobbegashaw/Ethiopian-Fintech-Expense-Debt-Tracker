import { query, queryOne } from '../database/db';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getLocalUserId() {
  const userStr = await AsyncStorage.getItem('user');
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  return user._id || user.id;
}

export const notificationService = {
  /**
   * Get user in-app notifications generated from local financial status (upcoming bills, budget warnings)
   */
  getNotifications: async (page = 1, limit = 50, unreadOnly = false) => {
    const userId = await getLocalUserId();
    if (!userId) return { success: true, count: 0, data: [] };

    const notifications = [];
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Upcoming and Overdue Bills
    const dueBills = await query(
      `SELECT * FROM planned_expenses 
       WHERE user_id = ? AND is_paid = 0 AND due_date <= ?
       ORDER BY due_date ASC LIMIT 10;`,
      [userId, threeDaysLater]
    );

    dueBills.forEach((b) => {
      const isOverdue = new Date(b.due_date) < now;
      notifications.push({
        _id: `bill_${b.id}`,
        id: `bill_${b.id}`,
        type: isOverdue ? 'overdue_bill' : 'upcoming_bill',
        title: isOverdue ? `Overdue Bill: ${b.title}` : `Upcoming Bill: ${b.title}`,
        message: `${b.amount} ${b.currency} due on ${new Date(b.due_date).toLocaleDateString()}`,
        read: false,
        createdAt: b.due_date,
      });
    });

    // 2. Budget Warnings
    const budgets = await query('SELECT * FROM budgets WHERE user_id = ? AND is_active = 1;', [userId]);
    for (const b of budgets) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const spendRes = await queryOne(
        `SELECT SUM(amount) as spent FROM account_transactions 
         WHERE user_id = ? AND type = 'expense' AND date >= ? 
         ${b.category !== 'All Categories' ? 'AND category = ?' : ''};`,
        b.category !== 'All Categories' ? [userId, startOfMonth, b.category] : [userId, startOfMonth]
      );
      const spent = spendRes?.spent || 0;
      if (b.amount > 0 && spent / b.amount >= 0.8) {
        const pct = Math.round((spent / b.amount) * 100);
        notifications.push({
          _id: `budget_${b.id}`,
          id: `budget_${b.id}`,
          type: 'budget_warning',
          title: `Budget Alert: ${b.name}`,
          message: `You have spent ${pct}% (${spent}/${b.amount} ETB) of your budget!`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return {
      success: true,
      count: notifications.length,
      data: notifications,
    };
  },

  markAsRead: async () => {
    return { success: true };
  },

  markAllAsRead: async () => {
    return { success: true };
  },

  deleteNotification: async () => {
    return { success: true };
  },

  registerPushToken: async (pushToken) => {
    if (pushToken) {
      await AsyncStorage.setItem('@local_push_token', pushToken);
    }
    return { success: true };
  },

  sendDebtReminder: async ({ debtorId, amount, description }) => {
    // In local-only mode, reminders are scheduled locally on device
    try {
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Debt Reminder Scheduled',
            body: `Reminder: ${description} (${amount} ETB)`,
          },
          trigger: null, // immediate local notification
        });
      }
    } catch {
      // Notification permissions might be disabled
    }
    return { success: true, message: 'Local reminder scheduled' };
  },

  /**
   * Schedule native local notification for an upcoming bill
   */
  scheduleBillReminder: async ({ title, amount, dueDate, reminderDaysBefore = 1 }) => {
    try {
      if (Platform.OS === 'web') return;

      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - reminderDaysBefore);

      if (triggerDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Bill Due Reminder: ${title}`,
            body: `${amount} ETB is due in ${reminderDaysBefore} day(s).`,
            sound: true,
          },
          trigger: {
            date: triggerDate,
          },
        });
      }
    } catch (err) {
      console.warn('Failed to schedule local notification:', err.message);
    }
  },
};

export default notificationService;
