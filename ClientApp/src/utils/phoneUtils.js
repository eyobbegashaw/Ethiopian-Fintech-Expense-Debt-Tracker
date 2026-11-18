/**
 * Normalizes an Ethiopian phone number to the standard 10-digit format starting with 09 or 07.
 * Handles:
 *  - 0911223344 -> 0911223344
 *  - 0712345678 -> 0712345678
 *  - +251911223344 -> 0911223344
 *  - +251712345678 -> 0712345678
 *  - 251911223344 -> 0911223344
 *  - 911223344 -> 0911223344
 *  - 712345678 -> 0712345678
 */
export const normalizeEthiopianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.replace(/[^0-9+]/g, '').trim();

  if (cleaned.startsWith('+251')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('251')) {
    cleaned = '0' + cleaned.slice(3);
  } else if ((cleaned.startsWith('9') || cleaned.startsWith('7')) && cleaned.length === 9) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
};

/**
 * Validates if a phone number starts with 09 or 07 and is exactly 10 digits
 */
export const isValidEthiopianPhone = (phone) => {
  const normalized = normalizeEthiopianPhone(phone);
  return /^(09|07)[0-9]{8}$/.test(normalized);
};
