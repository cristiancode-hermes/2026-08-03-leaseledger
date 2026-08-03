import { addDays, compareDates } from './dates';

export type PaymentStatus = 'due' | 'paid' | 'late' | 'overdue' | 'partial';

export interface PaymentStatusInput {
  dueDate: string; // YYYY-MM-DD
  graceDays: number;
  today: string; // YYYY-MM-DD
  paidAt: string | null;
  paidAmount: number;
  amount: number;
  /** If a late fee has been applied, the payment is 'overdue'. */
  lateFee: number | null;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Deterministic payment status derivation (spec US-14):
 *  - paid in full  → 'paid'
 *  - partial payment → 'partial'
 *  - late fee applied → 'overdue'
 *  - today > dueDate + graceDays (no fee yet) → 'late'
 *  - otherwise → 'due'
 */
export function derivePaymentStatus(input: PaymentStatusInput): PaymentStatus {
  const { dueDate, graceDays, today, paidAt, paidAmount, amount, lateFee } =
    input;
  if (paidAt) {
    if (paidAmount >= amount - 0.005) return 'paid';
    if (paidAmount > 0) return 'partial';
  }
  if (lateFee !== null && lateFee > 0) return 'overdue';
  const deadline = addDays(dueDate, graceDays);
  if (compareDates(today, deadline) > 0) return 'late';
  return 'due';
}

/** Late fee = round2(due amount × fee rate). */
export function computeLateFee(amount: number, feeRate: number): number {
  return round2(amount * feeRate);
}

/** True when today is past the grace deadline (fee should apply). */
export function isPastGraceDeadline(
  dueDate: string,
  graceDays: number,
  today: string,
): boolean {
  return compareDates(today, addDays(dueDate, graceDays)) > 0;
}

/** Remaining arrears for a payment (what is still owed). */
export function remainingFor(p: {
  amount: number;
  paidAmount: number;
}): number {
  return Math.max(0, Math.round((p.amount - p.paidAmount) * 100) / 100);
}
