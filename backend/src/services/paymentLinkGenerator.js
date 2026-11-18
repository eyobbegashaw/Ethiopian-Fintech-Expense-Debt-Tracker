const crypto = require('crypto');
const logger = require('../utils/logger');

class PaymentLinkGenerator {
  /**
   * Generate TeleBirr payment link/USSD code & app activation details
   * @param {String} phone - Phone number to pay
   * @param {Number} amount - Amount to pay
   * @param {String} reference - Transaction reference
   * @returns {Object} - Payment details
   */
  static generateTeleBirrPayment(phone, amount, reference) {
    const formattedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    const baseUssd = process.env.TELEBIRR_USSD_CODE || '*127#';
    const cleanPrefix = baseUssd.replace(/#/g, '');
    const ussdCode = `${cleanPrefix}*${formattedPhone}*${Math.round(amount)}#`;

    return {
      method: 'TeleBirr',
      appName: 'Telebirr',
      appPackage: 'cn.tydic.ethiopay',
      appScheme: 'telebirr://',
      appPlayStoreUrl: 'https://play.google.com/store/apps/details?id=cn.tydic.ethiopay',
      ussdCode,
      baseUssd,
      paymentLink: `telebirr://pay?phone=${formattedPhone}&amount=${amount}&ref=${reference}`,
      instructions: `Open Telebirr app or dial ${ussdCode} to pay ${amount} ETB`
    };
  }

  /**
   * Generate CBE Birr payment link/USSD code & app activation details
   * @param {String} phone - Phone number to pay
   * @param {Number} amount - Amount to pay
   * @param {String} reference - Transaction reference
   * @returns {Object} - Payment details
   */
  static generateCBEPayment(phone, amount, reference) {
    const formattedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    const baseUssd = process.env.CBE_USSD_CODE || '*847#';
    const cleanPrefix = baseUssd.replace(/#/g, '');
    const ussdCode = `${cleanPrefix}*${formattedPhone}*${Math.round(amount)}#`;

    return {
      method: 'CBE Birr',
      appName: 'CBE Mobile Banking',
      appPackage: 'com.combanketh.mobilebanking',
      appScheme: 'cbe://',
      appPlayStoreUrl: 'https://play.google.com/store/apps/details?id=com.combanketh.mobilebanking',
      ussdCode,
      baseUssd,
      paymentLink: `cbebirr://pay?phone=${formattedPhone}&amount=${amount}&ref=${reference}`,
      instructions: `Open CBE Mobile Banking or dial ${ussdCode} to pay ${amount} ETB`
    };
  }

  /**
   * Generate Amole payment link & USSD code
   * @param {String} phone - Phone number to pay
   * @param {Number} amount - Amount to pay
   * @param {String} reference - Transaction reference
   * @returns {Object} - Payment details
   */
  static generateAmolePayment(phone, amount, reference) {
    const formattedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    const baseUssd = process.env.AMOLE_USSD_CODE || '*850#';
    const cleanPrefix = baseUssd.replace(/#/g, '');
    const ussdCode = `${cleanPrefix}*${formattedPhone}*${Math.round(amount)}#`;

    return {
      method: 'Amole',
      appName: 'Amole',
      appPackage: 'com.dashen.amole',
      appScheme: 'amole://',
      appPlayStoreUrl: 'https://play.google.com/store/apps/details?id=com.dashen.amole',
      ussdCode,
      baseUssd,
      instructions: `Open Amole app or dial ${ussdCode} to pay ${amount} ETB`
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
    return [
      this.generateTeleBirrPayment(phone, amount, reference),
      this.generateCBEPayment(phone, amount, reference),
      this.generateAmolePayment(phone, amount, reference)
    ];
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
}

module.exports = PaymentLinkGenerator;
