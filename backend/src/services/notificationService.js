const twilio = require('twilio');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const hasCreds = sid && token;
    const sidLooksValid = typeof sid === 'string' && sid.startsWith('AC');

    if (!hasCreds || !sidLooksValid) {
      this.twilioClient = null;
      logger.warn('Twilio disabled: missing or invalid TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN');
      return;
    }

    try {
      this.twilioClient = twilio(sid, token);
    } catch (error) {
      this.twilioClient = null;
      logger.warn(`Twilio disabled: ${error.message}`);
    }
  }
  
  /**
   * Send SMS notification
   * @param {String} phone - Ethiopian phone number
   * @param {String} message - SMS content
   */
  async sendSMS(phone, message) {
    try {
      if (!this.twilioClient) {
        logger.warn('Twilio client not configured, SMS not sent');
        return false;
      }
      
      // Format Ethiopian phone number
      let formattedPhone = phone;
      if (!phone.startsWith('+')) {
        formattedPhone = phone.startsWith('0') ? `+251${phone.slice(1)}` : `+251${phone}`;
      }
      
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.SMS_SENDER_ID || '+15017122661',
        to: formattedPhone
      });
      
      logger.info(`SMS sent to ${phone}: ${result.sid}`);
      return true;
    } catch (error) {
      logger.error('Failed to send SMS:', error.message);
      return false;
    }
  }
  
  /**
   * Send debt reminder
   * @param {Object} debt - Debt details
   * @param {Object} user - User details
   */
  async sendDebtReminder(debt, user) {
    const message = `🔔 Debt Reminder: You owe ${debt.toName} ${debt.amount} ETB for ${debt.description}. Please settle soon!`;
    
    if (user.settings?.notifications?.sms) {
      await this.sendSMS(user.phone, message);
    }
    
    logger.info(`Debt reminder sent to ${user.name} (${user.phone})`);
    return true;
  }
  
  /**
   * Send settlement confirmation
   * @param {Object} settlement - Settlement details
   * @param {Object} fromUser - Payer
   * @param {Object} toUser - Receiver
   */
  async sendSettlementConfirmation(settlement, fromUser, toUser) {
    const fromMessage = `✅ Payment Confirmed: You paid ${toUser.name} ${settlement.amount} ETB via ${settlement.method}. Reference: ${settlement.transactionReference || 'N/A'}`;
    const toMessage = `💰 Payment Received: ${fromUser.name} paid you ${settlement.amount} ETB via ${settlement.method}. Reference: ${settlement.transactionReference || 'N/A'}`;
    
    if (fromUser.settings?.notifications?.sms) {
      await this.sendSMS(fromUser.phone, fromMessage);
    }
    
    if (toUser.settings?.notifications?.sms) {
      await this.sendSMS(toUser.phone, toMessage);
    }
    
    logger.info(`Settlement confirmation sent for ${settlement.amount} ETB`);
    return true;
  }
  
  /**
   * Send expense added notification
   * @param {Object} expense - Expense details
   * @param {Array} members - Group members
   */
  async sendExpenseNotification(expense, members) {
    const message = `💰 New Expense: ${expense.description} for ${expense.amount} ETB added by ${expense.paidByName}. Check your share!`;
    
    for (const member of members) {
      // Don't notify the person who added the expense
      if (member.userId.toString() === expense.paidBy.toString()) continue;
      
      if (member.settings?.notifications?.sms) {
        await this.sendSMS(member.phone, message);
      }
    }
    
    logger.info(`Expense notification sent for ${expense.description}`);
    return true;
  }
}

module.exports = new NotificationService();