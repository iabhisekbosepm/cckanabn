import { format, formatDistanceToNow, parseISO, parse } from 'date-fns';
import { toZonedTime, format as formatTz, fromZonedTime } from 'date-fns-tz';

// IST timezone
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Parse date from various formats (SQLite, ISO, etc.)
 * SQLite CURRENT_TIMESTAMP stores UTC time, so we need to treat it as UTC
 */
function parseDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date;

  // For SQLite format "2026-02-03 11:18:08" - treat as UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
    // Append 'Z' to treat as UTC
    return new Date(date.replace(' ', 'T') + 'Z');
  }

  // Try ISO format
  let parsed = parseISO(date);
  if (!isNaN(parsed.getTime())) return parsed;

  // Try date only format (for due dates)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return parseISO(date);
  }

  return new Date(date);
}

/**
 * Convert a date to IST timezone
 */
export function toIST(date) {
  if (!date) return null;
  const dateObj = parseDate(date);
  return toZonedTime(dateObj, IST_TIMEZONE);
}

/**
 * Format a date in IST timezone
 * @param {string|Date} date - The date to format
 * @param {string} formatStr - The format string (default: 'MMM d, yyyy h:mm a')
 */
export function formatInIST(date, formatStr = 'MMM d, yyyy h:mm a') {
  if (!date) return '';
  try {
    const dateObj = parseDate(date);
    if (!dateObj || isNaN(dateObj.getTime())) return String(date);
    const istDate = toZonedTime(dateObj, IST_TIMEZONE);
    return formatTz(istDate, formatStr, { timeZone: IST_TIMEZONE });
  } catch (error) {
    console.error('Date format error:', error);
    return String(date);
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago") in IST
 * @param {string|Date} date - The date to format
 */
export function formatRelativeIST(date) {
  if (!date) return '';
  try {
    const dateObj = parseDate(date);
    if (!dateObj || isNaN(dateObj.getTime())) return String(date);
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error('Date format error:', error);
    return String(date);
  }
}

/**
 * Format date for display with IST label
 * @param {string|Date} date - The date to format
 */
export function formatDateTimeIST(date) {
  if (!date) return '';
  return `${formatInIST(date, 'MMM d, yyyy h:mm a')} IST`;
}

/**
 * Format just the date part in IST
 * @param {string|Date} date - The date to format
 */
export function formatDateIST(date) {
  if (!date) return '';
  return formatInIST(date, 'MMM d, yyyy');
}

/**
 * Format just the time part in IST
 * @param {string|Date} date - The date to format
 */
export function formatTimeIST(date) {
  if (!date) return '';
  return formatInIST(date, 'h:mm a');
}

/**
 * Get current date in IST
 */
export function getCurrentIST() {
  return toZonedTime(new Date(), IST_TIMEZONE);
}

/**
 * Format date for activity log - shows relative time with full date on hover
 * @param {string|Date} date - The date to format
 */
export function formatActivityDate(date) {
  if (!date) return '';
  const relative = formatRelativeIST(date);
  const full = formatInIST(date, 'MMM d, yyyy h:mm a');
  return { relative, full };
}
