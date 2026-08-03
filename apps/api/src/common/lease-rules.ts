import { compareDates } from './dates';

/**
 * Lease domain rules — overlap validation and the lease status machine.
 * All dates are inclusive 'YYYY-MM-DD' strings.
 */

/**
 * True if two inclusive date ranges [aStart, aEnd] and [bStart, bEnd] overlap.
 * A lease occupying the exact same day as another is an overlap.
 */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return compareDates(aStart, bEnd) <= 0 && compareDates(bStart, aEnd) <= 0;
}

/**
 * Effective lease status on a given day (on-read derivation).
 *  - 'terminated' stays terminated (terminal state)
 *  - 'expired' stays expired (terminal state)
 *  - an 'active' lease whose endDate < today is presented as 'expired'
 *  - a 'draft' lease whose startDate <= today is presented as 'active'
 */
export function leaseStatusOn(
  status: string,
  startDate: string,
  endDate: string,
  today: string,
): string {
  if (status === 'terminated' || status === 'expired') return status;
  if (status === 'active' && compareDates(endDate, today) < 0) return 'expired';
  if (status === 'draft' && compareDates(startDate, today) <= 0) return 'active';
  return status;
}

/** A lease can be renewed only while active. */
export function canRenew(status: string): boolean {
  return status === 'active';
}

/** A lease can be terminated only if not already terminated/expired. */
export function canTerminate(status: string): boolean {
  return status === 'active' || status === 'draft';
}
