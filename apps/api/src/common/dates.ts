/**
 * Date helpers — all business dates are 'YYYY-MM-DD' strings (UTC), no time.
 */

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

/** Add n days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return formatDate(d);
}

/** Compare two YYYY-MM-DD strings: -1 if a<b, 0 if equal, 1 if a>b. */
export function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in a given month (1-12) for a year — handles leap years (Feb 29). */
export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

/** Parse 'YYYY-MM' into {year, month}. */
export function parseYearMonth(ym: string): YearMonth {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

/** Last day (1-31) of a year/month. */
export function lastDayOfMonth(ym: YearMonth): number {
  return daysInMonth(ym.year, ym.month);
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
