import { daysInMonth } from './dates';

export interface ProrationResult {
  /** Prorated amount for the first (partial) month, rounded to 2 decimals. */
  amount: number;
  /** Days the tenant occupies in the first month (inclusive of move-in day). */
  daysOccupied: number;
  /** Total days in the first month (leap-year aware). */
  daysInMonth: number;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Prorate the first month's rent when a tenant moves in mid-month.
 *
 * Formula (from spec): prorated = round2(monthlyRent / daysInMonth
 * * (daysInMonth - dayOfMoveIn + 1)) — the move-in day itself is charged.
 *
 * Test fixtures:
 *  - move-in Aug 15 → 17/31 days
 *  - Feb 1 on a leap year → full month (29 days)
 *  - Feb 28 start on a non-leap year → 1/28 days
 */
export function prorateRent(
  monthlyRent: number,
  year: number,
  month: number, // 1-12
  dayOfMoveIn: number,
): ProrationResult {
  const total = daysInMonth(year, month);
  const clamped = Math.min(Math.max(dayOfMoveIn, 1), total);
  const daysOccupied = total - clamped + 1;
  const amount = round2((monthlyRent / total) * daysOccupied);
  return { amount, daysOccupied, daysInMonth: total };
}
