/**
 * Client-Side Ethiopian Financial SMS Parser
 */

const SECURITY_PATTERNS = [
  /\b(otp|one[- ]time[- ]password|verification code|security code)\b/i,
  /(የማረጋገጫ ኮድ|ሚስጥር ቁጥር|ሚስጥራዊ ቁጥር|የይለፍ ቃል)/,
  /\bdo not share (this|your) (code|otp|password)\b/i,
  /(ለማንም አያጋሩ|ለሌላ ሰው አያጋሩ)/,
];

export function isSecurityMessage(text) {
  if (!text || typeof text !== 'string') return false;
  return SECURITY_PATTERNS.some((pattern) => pattern.test(text));
}

function parseNumber(numStr) {
  if (!numStr) return 0;
  const cleaned = numStr.replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseFinancialSMS(rawMessage, sender = '') {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return { error: 'Empty message' };
  }

  if (isSecurityMessage(rawMessage)) {
    return {
      isSecurityMessage: true,
      error: 'Security OTP / Password message detected and discarded for privacy and security',
    };
  }

  const text = rawMessage;
  let provider = 'other';
  let type = 'unknown';
  let amount = 0;
  let referenceNumber = null;
  let detectedBalance = null;
  let counterparty = '';

  const isTelebirr = /telebirr/i.test(sender) || /telebirr/i.test(text) || /ቴሌብር/i.test(text);
  const isCBEBirr = /cbe\s*birr/i.test(sender) || /cbe\s*birr/i.test(text) || /ሲቢኢ\s*ብር/i.test(text);
  const isCBE = /cbe/i.test(sender) || /commercial bank/i.test(sender) || /commercial bank of ethiopia/i.test(text) || /የኢትዮጵያ ንግድ ባንክ/i.test(text) || /1000\*{3,}\d+/.test(text);
  const isAmole = /amole/i.test(sender) || /dashen/i.test(sender) || /amole/i.test(text) || /ዳሽን/i.test(text) || /አሞሌ/i.test(text);

  if (isTelebirr) provider = 'telebirr';
  else if (isCBEBirr) provider = 'cbe_birr';
  else if (isCBE) provider = 'cbe';
  else if (isAmole) provider = 'amole';

  // Reference number match
  const refMatch = text.match(/(?:Transaction ID|Txn ID|Ref|Reference|የግብይት መለያ|የግብይት ቁጥር|ማጣቀሻ)\s*[:፡]?\s*([A-Za-z0-9]+)/i);
  if (refMatch) referenceNumber = refMatch[1].trim();

  // Balance match
  const balMatch = text.match(/(?:balance is|current balance is|available balance|ቀሪ ሒሳብዎ|ቀሪ ሒሳብ)\s*(?:ETB|ብር)?\s*[:፡]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (balMatch) detectedBalance = parseNumber(balMatch[1]);

  // Credit / Income match
  const incomeEn = text.match(/(?:received|credited with|deposited)\s+(?:ETB\s+)?([0-9,]+(?:\.[0-9]{1,2})?)(?:\s+from\s+([^.]+))?/i);
  const incomeAm = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*(?:ከ\s*([^.]+?))?\s*(?:ገቢ\s*ተደርጎልዎታል|ገቢ\s*ሆኗል)/i);

  // Debit / Expense match
  const expenseEn = text.match(/(?:transferred|paid|debited with|sent)\s+(?:ETB\s+)?([0-9,]+(?:\.[0-9]{1,2})?)(?:\s+to\s+([^.]+))?/i);
  const expenseAm = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*ብር\s*(?:ወደ\s*([^.]+?))?\s*(?:አስተላልፈዋል|ከፍለዋል|ወጪ\s*ተደርጓል|ተላልፏል)/i);

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
    const fallbackAmount = text.match(/(?:ETB|ብር)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) || text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|ብር)/i);
    if (fallbackAmount) amount = parseNumber(fallbackAmount[1]);
  }

  return {
    isSecurityMessage: false,
    provider,
    type: type === 'unknown' ? 'expense' : type,
    amount,
    currency: 'ETB',
    referenceNumber,
    detectedBalance,
    counterparty,
    rawMessage,
    sender,
  };
}

export default { isSecurityMessage, parseFinancialSMS };
