// ============================================
// ShopFlow — Pakistan Time (PKT, UTC+05:00) helpers
//
// Servers (Vercel / Supabase) run in UTC. A shop in Peshawar closes its
// "day" at midnight PKT, not midnight UTC. Every "today / this week /
// this month" calculation MUST go through these helpers, otherwise sales
// made between 12:00 AM and 5:00 AM land on the wrong day.
// Pakistan has no daylight saving, so a fixed offset is exact.
// ============================================

export const SHOP_TIME_ZONE = 'Asia/Karachi';
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Calendar parts of "now" (or a given instant) as seen in Pakistan. */
function pktParts(date: Date = new Date()) {
  const shifted = new Date(date.getTime() + PKT_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(), // 0-11
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(), // 0 = Sunday
    hour: shifted.getUTCHours(),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** UTC instant of 00:00 PKT for the given PKT calendar date. */
function pktMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - PKT_OFFSET_MS);
}

/** Today's date in Pakistan as YYYY-MM-DD (for DATE columns like expense_date). */
export function pktTodayDateStr(date: Date = new Date()): string {
  const p = pktParts(date);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/** Current billing month in Pakistan as YYYY-MM. */
export function pktMonthStr(date: Date = new Date()): string {
  const p = pktParts(date);
  return `${p.year}-${pad(p.month + 1)}`;
}

/** Current hour (0-23) in Pakistan — used for greetings. */
export function pktHour(date: Date = new Date()): number {
  return pktParts(date).hour;
}

/** [start, end) of today in PKT, as UTC ISO strings for timestamptz filters. */
export function pktTodayRange(date: Date = new Date()): { start: string; end: string } {
  const p = pktParts(date);
  return {
    start: pktMidnightUtc(p.year, p.month, p.day).toISOString(),
    end: pktMidnightUtc(p.year, p.month, p.day + 1).toISOString(),
  };
}

export type ReportRange = 'today' | 'week' | 'month' | 'all';

/**
 * Start of a reporting period in PKT.
 * Returns both the UTC ISO instant (for created_at) and the PKT date
 * string (for DATE columns such as expense_date / purchase_date).
 */
export function pktRangeStart(range: ReportRange, date: Date = new Date()): { iso: string; date: string } | null {
  const p = pktParts(date);
  let start: Date;
  if (range === 'today') {
    start = pktMidnightUtc(p.year, p.month, p.day);
  } else if (range === 'week') {
    const daysSinceMonday = (p.weekday + 6) % 7;
    start = pktMidnightUtc(p.year, p.month, p.day - daysSinceMonday);
  } else if (range === 'month') {
    start = pktMidnightUtc(p.year, p.month, 1);
  } else {
    return null;
  }
  return { iso: start.toISOString(), date: pktTodayDateStr(start) };
}

/** Invoice-style date stamp YYYYMMDD in PKT. */
export function pktDateStamp(date: Date = new Date()): string {
  return pktTodayDateStr(date).replace(/-/g, '');
}

/** Format an instant for display in Pakistan time. */
export function formatPktDateTime(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  return new Date(value).toLocaleString('en-PK', { timeZone: SHOP_TIME_ZONE, ...options });
}
