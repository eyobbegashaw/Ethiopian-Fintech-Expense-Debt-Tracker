import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Ethiopian & Gregorian Date and Time Formatting Utilities
 */

export const ETHIOPIAN_MONTHS = {
  en: [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ],
  am: [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ]
};

export const GREGORIAN_MONTHS = {
  en: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ],
  am: [
    'ጃንዋሪ', 'ፌብሩዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
    'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'
  ]
};

function gregorianToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToEthiopian(jdn) {
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

export function toEthiopianDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const jdn = gregorianToJDN(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const eth = jdnToEthiopian(jdn);
  return {
    year: eth.year,
    month: eth.month,
    day: eth.day,
    monthNameEn: ETHIOPIAN_MONTHS.en[eth.month - 1] || '',
    monthNameAm: ETHIOPIAN_MONTHS.am[eth.month - 1] || '',
  };
}

/**
 * Format time according to 12h or 24h setting
 */
export function formatTime(dateInput, timeFormat = '12h', language = 'en') {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');

  if (timeFormat === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // 12-hour AM/PM format
  const period = hours >= 12 ? 'PM' : 'AM';
  const periodAm = hours >= 12 ? 'ከሰዓት' : 'ጧት';
  const displayHours = hours % 12 || 12;
  const displayPeriod = language === 'am' ? periodAm : period;

  return `${displayHours}:${minutes} ${displayPeriod}`;
}

/**
 * Format full date according to calendar preference (ethiopian or gregorian)
 */
export function formatAppDate(dateInput, options = {}) {
  const {
    calendar = 'ethiopian',
    timeFormat = '12h',
    language = 'en',
    includeTime = false,
    format = 'medium',
  } = options;

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  let dateStr = '';
  if (calendar === 'ethiopian') {
    const eth = toEthiopianDate(d);
    if (eth) {
      const monthName = language === 'am' ? eth.monthNameAm : eth.monthNameEn;
      if (format === 'short') {
        dateStr = `${monthName} ${eth.day}`;
      } else {
        dateStr = `${monthName} ${eth.day}, ${eth.year}`;
      }
    } else {
      dateStr = d.toLocaleDateString();
    }
  } else {
    // Gregorian
    const month = GREGORIAN_MONTHS[language === 'am' ? 'am' : 'en'][d.getMonth()];
    if (format === 'short') {
      dateStr = `${month} ${d.getDate()}`;
    } else {
      dateStr = `${month} ${d.getDate()}, ${d.getFullYear()}`;
    }
  }

  if (includeTime) {
    const atWord = language === 'am' ? ' ' : ' at ';
    return `${dateStr}${atWord}${formatTime(d, timeFormat, language)}`;
  }

  return dateStr;
}

/**
 * Format relative time (e.g. "Just now", "5m ago", or Ethiopian date)
 */
export function formatRelativeTime(dateInput, options = {}) {
  const {
    calendar = 'ethiopian',
    timeFormat = '12h',
    language = 'en',
  } = options;

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return language === 'am' ? 'አሁን' : 'Just now';
  }
  if (diffMin < 60) {
    return language === 'am' ? `ከ${diffMin} ደቂቃ በፊት` : `${diffMin}m ago`;
  }
  if (diffHours < 24 && now.getDate() === d.getDate()) {
    const timeStr = formatTime(d, timeFormat, language);
    return language === 'am' ? `ዛሬ ${timeStr}` : `Today at ${timeStr}`;
  }
  if (diffDays === 1) {
    const timeStr = formatTime(d, timeFormat, language);
    return language === 'am' ? `ትናንት ${timeStr}` : `Yesterday at ${timeStr}`;
  }

  // Older dates: format using Ethiopian or Gregorian calendar
  return formatAppDate(d, {
    calendar,
    timeFormat,
    language,
    includeTime: diffDays < 7,
  });
}

/**
 * Get formatted today banner string
 */
export function getTodayBanner(calendar = 'ethiopian', language = 'en') {
  return formatAppDate(new Date(), { calendar, language, includeTime: false });
}

/**
 * React Hook for easily formatting dates according to user's saved settings
 */
export function useAppDate() {
  const { user } = useAuth();
  const { language, isAmharic } = useLanguage();
  const calendar = user?.settings?.calendar || 'ethiopian';
  const timeFormat = user?.settings?.timeFormat || '12h';
  const lang = language || (isAmharic ? 'am' : 'en');

  const formatDate = (date, options = {}) => {
    return formatAppDate(date, {
      calendar,
      timeFormat,
      language: lang,
      ...options,
    });
  };

  const formatShort = (date) => {
    return formatAppDate(date, {
      calendar,
      language: lang,
      format: 'short',
    });
  };

  const formatDateTime = (date) => {
    return formatAppDate(date, {
      calendar,
      timeFormat,
      language: lang,
      includeTime: true,
    });
  };

  const formatRelative = (date) => {
    return formatRelativeTime(date, {
      calendar,
      timeFormat,
      language: lang,
    });
  };

  return {
    calendar,
    timeFormat,
    language: lang,
    formatDate,
    formatShort,
    formatDateTime,
    formatRelative,
  };
}
