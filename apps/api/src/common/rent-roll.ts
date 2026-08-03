import {
  daysInMonth,
  formatDate,
  parseDate,
  parseYearMonth,
} from './dates';

/**
 * Rent roll helpers — due-date computation for a lease within a month and
 * month-level totals. Deterministic and unit-testable.
 */

export interface RollInput {
  startDate: string; // lease start 'YYYY-MM-DD'
  endDate: string; // lease end 'YYYY-MM-DD'
  startDayOfMonth: number; // day-of-month the rent is due (from lease start)
  monthlyRent: number;
}

/**
 * Does this lease generate a due row in the given month (YYYY-MM)?
 * A lease is on the roll when its [startDate, endDate] range intersects the month.
 */
export function leaseInMonth(
  startDate: string,
  endDate: string,
  ym: string,
): boolean {
  const { year, month } = parseYearMonth(ym);
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
  return startDate <= monthEnd && endDate >= monthStart;
}

/**
 * Due date for a lease in a month (excluding the very first month, whose due
 * date is the lease start date itself). The due day is the day-of-month of the
 * lease start, capped at the month's length (a 31st-start falls on the 30th in
 * a 30-day month).
 */
export function dueDateForMonth(
  startDate: string,
  startDayOfMonth: number,
  ym: string,
): string {
  const { year, month } = parseYearMonth(ym);
  const cap = daysInMonth(year, month);
  const day = Math.min(startDayOfMonth, cap);
  return `${ym}-${String(day).padStart(2, '0')}`;
}

/** First-month due date is the lease start date itself. */
export function firstDueDate(startDate: string): string {
  return startDate;
}

/** Is the given date within the lease's first month (i.e. the prorated period)? */
export function isFirstMonth(
  startDate: string,
  date: string,
): boolean {
  const s = parseDate(startDate);
  const d = parseDate(date);
  return (
    d.getUTCFullYear() === s.getUTCFullYear() &&
    d.getUTCMonth() === s.getUTCMonth()
  );
}

export interface RollTotals {
  due: number;
  collected: number;
  arrears: number;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Totals across rent-roll rows (already derived statuses). */
export function monthTotals(rows: {
  amount: number;
  paidAmount: number;
  status: string;
}[]): RollTotals {
  let due = 0;
  let collected = 0;
  let arrears = 0;
  for (const r of rows) {
    due = round2(due + r.amount);
    collected = round2(collected + r.paidAmount);
    if (r.status !== 'paid') arrears = round2(arrears + (r.amount - r.paidAmount));
  }
  return { due, collected, arrears };
}

/** Format a date as 'YYYY-MM' for month navigation. */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Format YYYY-MM-DD for display. */
export function formatDisplay(dateStr: string): string {
  return formatDate(parseDate(dateStr));
}
