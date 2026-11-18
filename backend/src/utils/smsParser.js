/**
 * Ethiopian Financial SMS Parsing Engine
 * Supports TeleBirr, CBE Birr, Commercial Bank of Ethiopia (CBE), and Amole (Dashen)
 * Both English and Amharic formats.
 */

// Regex test for OTP and sensitive security codes
const SECURITY_PATTERNS = [
  /\b(otp|one[- ]time[- ]password|verification code|security code)\b/i,
  /(የማረጋገጫ ኮድ|ሚስጥር ቁጥር|ሚስጥራዊ ቁጥር|የይለፍ ቃል)/,
  /\bdo not share (this|your) (code|otp|password)\b/i,
  /(ለማንም አያጋሩ|ለሌላ ሰው አያጋሩ)/,
];

/**
 * Checks if message is a sensitive OTP or authentication message
 */
function isSecurityMessage(text) {
  if (!text || typeof text !== 'string') return false;
  return SECURITY_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Helper to extract number from formatted string (e.g. "1,450.50" -> 1450.50)
 */
function parseNumber(numStr) {
  if (!numStr) return 0;
  const cleaned = numStr.replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses TeleBirr SMS
 */
function parseTelebirr(text, sender = '') {
  // Provider detection
  const isTelebirr =
    /telebirr/i.test(sender) ||
    /telebirr/i.test(text) ||
    /ቴሌብር/i.test(text);

  if (!isTelebirr) return null;

  let type = 'unknown';
  let amount = 0;
  let counterparty = '';
  let referenceNumber = null;
  let detectedBalance = null;

  // Reference number
  const refMatch =
    text.match(/(?:Transaction ID|Txn ID|የግብይት መለያ|የግብይት ቁጥር)\s*[:፡]\s*([A-Za-z0-9]+)/i) ||
    text.match(/\b([T][A-Z0-9]{7,15})\b/);
  if (refMatch) {
    referenceNumber = refMatch[1].trim();
  }

  // Current balance
  const balMatch =
    text.match(/(?:balance is|current balance is|ቀሪ ሒሳብዎ)\s*(?:ETB|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|ብር)?\s*(?:ነው|ቀሪ)/i);
  if (balMatch) {
    detectedBalance = parseNumber(balMatch[1]);
  }

  // Income patterns (English & Amharic)
  // "received ETB 1000.00 from 0922334455 (Almaz Ayele)"
  // "deposited ETB 2000.00"
  // "1,000.00 ብር ከ 0922334455 ገቢ ተደርጎልዎታል።"
  const incomeEn = text.match(/(?:received|credited with|deposited)\s+(?:ETB\s+)?([0-9,]+(?:\.[0-9]{1,2})?)(?:\s+from\s+([^.]+))?/i);
  const incomeAm = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*(?:ከ\s*([^.]+?))?\s*ገቢ\s*ተደርጎልዎታል/i);

  // Expense patterns (English & Amharic)
  // "transferred ETB 500.00 to 0911223344 (Abebe Kebede)"
  // "paid ETB 250.00 to TOTAL"
  // "500.00 ብር ወደ 0911223344 አስተላልፈዋል"
  const expenseEn = text.match(/(?:transferred|paid|debited with)\s+(?:ETB\s+)?([0-9,]+(?:\.[0-9]{1,2})?)(?:\s+to\s+([^.]+))?/i);
  const expenseAm = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*(?:ወደ\s*([^.]+?))?\s*(?:አስተላልፈዋል|ከፍለዋል|ወጪ)/i);

  if (incomeEn) {
    type = 'income';
    amount = parseNumber(incomeEn[1]);
    if (incomeEn[2]) counterparty = incomeEn[2].split('.')[0].trim();
  } else if (incomeAm) {
    type = 'income';
    amount = parseNumber(incomeAm[1]);
    if (incomeAm[2]) counterparty = incomeAm[2].trim();
  } else if (expenseEn) {
    type = 'expense';
    amount = parseNumber(expenseEn[1]);
    if (expenseEn[2]) counterparty = expenseEn[2].split('.')[0].trim();
  } else if (expenseAm) {
    type = 'expense';
    amount = parseNumber(expenseAm[1]);
    if (expenseAm[2]) counterparty = expenseAm[2].trim();
  } else {
    // Fallback amount match
    const generalAmount = text.match(/(?:ETB|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|ብር)/i);
    if (generalAmount) {
      amount = parseNumber(generalAmount[1]);
    }
  }

  return {
    provider: 'telebirr',
    type,
    amount,
    currency: 'ETB',
    referenceNumber,
    detectedBalance,
    counterparty,
    detectedCategory: type === 'income' ? 'Other Income' : 'Utilities',
  };
}

/**
 * Parses CBE Birr SMS
 */
function parseCBEBirr(text, sender = '') {
  const isCBEBirr =
    /cbe\s*birr/i.test(sender) ||
    /cbe\s*birr/i.test(text) ||
    /ሲቢኢ\s*ብር/i.test(text);

  if (!isCBEBirr) return null;

  let type = 'unknown';
  let amount = 0;
  let counterparty = '';
  let referenceNumber = null;
  let detectedBalance = null;

  // Reference number
  const refMatch = text.match(/(?:Txn ID|Transaction ID|የግብይት መለያ)\s*[:፡]?\s*([A-Za-z0-9]+)/i);
  if (refMatch) {
    referenceNumber = refMatch[1].trim();
  }

  // Balance
  const balMatch = text.match(/(?:balance is|ቀሪ ሒሳብ)\s*(?:ETB|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (balMatch) {
    detectedBalance = parseNumber(balMatch[1]);
  }

  const income = text.match(/(?:received|ገቢ ሆኗል)\s*(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*(?:ከ\s*([^.]+?))?\s*ገቢ\s*ሆኗል/i);

  const expense = text.match(/(?:transferred|paid|sent|ወጪ)\s*(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*(?:ወደ\s*([^.]+?))?\s*ተላልፏል/i);

  if (income) {
    type = 'income';
    amount = parseNumber(income[1]);
  } else if (expense) {
    type = 'expense';
    amount = parseNumber(expense[1]);
  }

  return {
    provider: 'cbe_birr',
    type,
    amount,
    currency: 'ETB',
    referenceNumber,
    detectedBalance,
    counterparty,
    detectedCategory: type === 'income' ? 'Other Income' : 'Other Expense',
  };
}

/**
 * Parses Commercial Bank of Ethiopia (CBE) Bank Account SMS
 */
function parseCBEBank(text, sender = '') {
  const isCBE =
    /cbe/i.test(sender) ||
    /commercial bank/i.test(sender) ||
    /commercial bank of ethiopia/i.test(text) ||
    /የኢትዮጵያ ንግድ ባንክ/i.test(text) ||
    /\b1000\d{8,}\b/.test(text) ||
    /1000\*{3,}\d+/.test(text);

  if (!isCBE) return null;

  let type = 'unknown';
  let amount = 0;
  let referenceNumber = null;
  let detectedBalance = null;

  // Ref match
  const refMatch = text.match(/(?:Ref|Reference|ማጣቀሻ)\s*[:፡]?\s*([A-Za-z0-9]+)/i);
  if (refMatch) {
    referenceNumber = refMatch[1].trim();
  }

  // Balance match
  const balMatch = text.match(/(?:Current Balance|Available Balance|ቀሪ ሒሳብ)\s*[:፡]?\s*(?:ETB|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (balMatch) {
    detectedBalance = parseNumber(balMatch[1]);
  }

  // Credit (Income)
  // "credited with ETB 5,000.00" or "በ 5,000.00 ብር ገቢ ሆኗል"
  const creditEn = text.match(/credited with\s+(?:ETB\s+)?([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const creditAm = text.match(/(?:በ\s*)?([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*ገቢ\s*ሆኗል/i);

  // Debit (Expense)
  // "debited with ETB 1,200.00" or "1,200.00 ብር ወጪ ተደርጓል"
  const debitEn = text.match(/debited with\s+(?:ETB\s+)?([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const debitAm = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*ወጪ\s*ተደርጓል/i);

  if (creditEn) {
    type = 'income';
    amount = parseNumber(creditEn[1]);
  } else if (creditAm) {
    type = 'income';
    amount = parseNumber(creditAm[1]);
  } else if (debitEn) {
    type = 'expense';
    amount = parseNumber(debitEn[1]);
  } else if (debitAm) {
    type = 'expense';
    amount = parseNumber(debitAm[1]);
  }

  return {
    provider: 'cbe',
    type,
    amount,
    currency: 'ETB',
    referenceNumber,
    detectedBalance,
    counterparty: '',
    detectedCategory: type === 'income' ? 'Salary' : 'Other Expense',
  };
}

/**
 * Parses Amole / Dashen Bank SMS
 */
function parseAmole(text, sender = '') {
  const isAmole =
    /amole/i.test(sender) ||
    /dashen/i.test(sender) ||
    /amole/i.test(text) ||
    /ዳሽን/i.test(text) ||
    /አሞሌ/i.test(text);

  if (!isAmole) return null;

  let type = 'unknown';
  let amount = 0;
  let referenceNumber = null;
  let detectedBalance = null;

  const refMatch = text.match(/(?:Ref|Txn ID)\s*[:፡]?\s*([A-Za-z0-9]+)/i);
  if (refMatch) referenceNumber = refMatch[1].trim();

  const balMatch = text.match(/(?:balance|ቀሪ)\s*[:፡]?\s*(?:ETB|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (balMatch) detectedBalance = parseNumber(balMatch[1]);

  const credit = text.match(/(?:credited with|received|ገቢ)\s*(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const debit = text.match(/(?:debited with|paid|transferred|ወጪ)\s*(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i);

  if (credit) {
    type = 'income';
    amount = parseNumber(credit[1]);
  } else if (debit) {
    type = 'expense';
    amount = parseNumber(debit[1]);
  }

  return {
    provider: 'amole',
    type,
    amount,
    currency: 'ETB',
    referenceNumber,
    detectedBalance,
    counterparty: '',
    detectedCategory: type === 'income' ? 'Other Income' : 'Shopping',
  };
}

/**
 * Generic Ethiopian Bank fallback parser
 */
function parseGeneric(text, sender = '') {
  let type = 'unknown';
  let amount = 0;
  let referenceNumber = null;
  let detectedBalance = null;

  const refMatch = text.match(/(?:Ref|ID|Txn|መለያ|ማጣቀሻ)\s*[:፡]?\s*([A-Za-z0-9]+)/i);
  if (refMatch) referenceNumber = refMatch[1].trim();

  const credit = text.match(/(?:credited|received|ገቢ)\s*(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const debit = text.match(/(?:debited|paid|transferred|ወጪ)\s*(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i);

  if (credit) {
    type = 'income';
    amount = parseNumber(credit[1]);
  } else if (debit) {
    type = 'expense';
    amount = parseNumber(debit[1]);
  } else {
    const amountMatch = text.match(/(?:ETB|ብር)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|ብር)/i);
    if (amountMatch) {
      amount = parseNumber(amountMatch[1]);
    }
  }

  return {
    provider: 'other',
    type,
    amount,
    currency: 'ETB',
    referenceNumber,
    detectedBalance,
    counterparty: '',
    detectedCategory: type === 'income' ? 'Other Income' : 'Other Expense',
  };
}

/**
 * Master parse function that determines provider and runs corresponding parser
 */
function parseFinancialSMS(rawMessage, sender = '') {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return { error: 'Empty message' };
  }

  // 1. Strict Privacy Gate: Check for OTP or authentication passwords
  if (isSecurityMessage(rawMessage)) {
    return {
      isSecurityMessage: true,
      error: 'Security OTP / Password message detected and discarded for privacy and security',
    };
  }

  // 2. Try provider specific parsers
  let result =
    parseTelebirr(rawMessage, sender) ||
    parseCBEBirr(rawMessage, sender) ||
    parseCBEBank(rawMessage, sender) ||
    parseAmole(rawMessage, sender);

  // 3. Fallback to generic
  if (!result || result.amount <= 0) {
    result = parseGeneric(rawMessage, sender);
  }

  return {
    isSecurityMessage: false,
    ...result,
    rawMessage,
    sender,
  };
}

module.exports = {
  isSecurityMessage,
  parseFinancialSMS,
  parseTelebirr,
  parseCBEBirr,
  parseCBEBank,
  parseAmole,
};
