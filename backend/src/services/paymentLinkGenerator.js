const crypto = require('crypto');
const logger = require('../utils/logger');

class PaymentLinkGenerator {
  /**
   * Generate TeleBirr payment link/USSD code
   * @param {String} phone - Phone number to pay
   * @param {Number} amount - Amount to pay
   * @param {String} reference - Transaction reference
   * @returns {Object} - Payment details
   */
  static generateTeleBirrPayment(phone, amount, reference) {
    // Format Ethiopian phone number
    const formattedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    
    // Generate USSD code for TeleBirr
    const ussdCode = `*899#*${formattedPhone}*${Math.round(amount)}#`;
    
    // In production, this would generate an actual payment link
    const paymentLink = `telebirr://pay?phone=${formattedPhone}&amount=${amount}&ref=${reference}`;
    
    return {
      method: 'TeleBirr',
      ussdCode,
      paymentLink,
      instructions: `Dial ${ussdCode} on your Telebirr registered number to pay ${amount} ETB`
    };
  }
  
  /**
   * Generate CBE Birr payment link/USSD code
   * @param {String} phone - Phone number to pay
   * @param {Number} amount - Amount to pay
   * @param {String} reference - Transaction reference
   * @returns {Object} - Payment details
   */
  static generateCBEPayment(phone, amount, reference) {
    // Format Ethiopian phone number
    const formattedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    
    // Generate USSD code for CBE Birr
    const ussdCode = `*847#*${formattedPhone}*${Math.round(amount)}#`;
    
    // In production, this would generate an actual payment link
    const paymentLink = `cbebirr://pay?phone=${formattedPhone}&amount=${amount}&ref=${reference}`;
    
    return {
      method: 'CBE Birr',
      ussdCode,
      paymentLink,
      instructions: `Dial ${ussdCode} on your CBE Birr registered number to pay ${amount} ETB`
    };
  }
  
  /**
   * Generate Amole payment link
   * @param {String} phone - Phone number to pay
   * @param {Number} amount - Amount to pay
   * @param {String} reference - Transaction reference
   * @returns {Object} - Payment details
   */
  static generateAmolePayment(phone, amount, reference) {
    const formattedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    const ussdCode = `*850#*${formattedPhone}*${Math.round(amount)}#`;
    
    return {
      method: 'Amole',
      ussdCode,
      instructions: `Dial ${ussdCode} on your Amole registered number to pay ${amount} ETB`
    };
  }
  
  /**
   * Generate payment options for a debt
   * @param {String} phone - Receiver's phone number
   * @param {Number} amount - Amount to pay
   * @param {String} reference - Transaction reference
   * @returns {Array} - List of payment options
   */
  static generatePaymentOptions(phone, amount, reference) {
    const options = [];
    
    // Add TeleBirr option
    options.push(this.generateTeleBirrPayment(phone, amount, reference));
    
    // Add CBE Birr option
    options.push(this.generateCBEPayment(phone, amount, reference));
    
    // Add Amole option
    options.push(this.generateAmolePayment(phone, amount, reference));
    
    return options;
  }
  
  /**
   * Generate a unique transaction reference
   * @returns {String} - Unique reference
   */
  static generateReference() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }
  
  /**
   * Validate payment webhook (for production)
   * @param {Object} payload - Webhook payload
   * @param {String} signature - Webhook signature
   * @param {String} secret - Webhook secret
   * @returns {Boolean} - Valid or not
   */
  static validateWebhook(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = PaymentLinkGenerator;