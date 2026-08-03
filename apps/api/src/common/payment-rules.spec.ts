import {
  computeLateFee,
  derivePaymentStatus,
  isPastGraceDeadline,
  remainingFor,
} from './payment-rules';

const base = {
  dueDate: '2026-08-01',
  graceDays: 5,
  today: '2026-08-03',
  paidAt: null as string | null,
  paidAmount: 0,
  amount: 800,
  lateFee: null as number | null,
};

describe('derivePaymentStatus', () => {
  it('is due while within the grace window', () => {
    expect(derivePaymentStatus({ ...base, today: '2026-08-06' })).toBe('due');
  });

  it('is late the day after the grace deadline (no fee applied yet)', () => {
    expect(derivePaymentStatus({ ...base, today: '2026-08-07' })).toBe('late');
  });

  it('is overdue once a late fee was applied', () => {
    expect(derivePaymentStatus({ ...base, today: '2026-08-07', lateFee: 32 })).toBe('overdue');
  });

  it('is paid when paid in full', () => {
    expect(
      derivePaymentStatus({ ...base, paidAt: '2026-08-02', paidAmount: 800 }),
    ).toBe('paid');
  });

  it('is partial when paid less than the full amount', () => {
    expect(
      derivePaymentStatus({ ...base, paidAt: '2026-08-02', paidAmount: 400 }),
    ).toBe('partial');
  });

  it('partial payment past deadline still shows partial (paid wins over late)', () => {
    expect(
      derivePaymentStatus({
        ...base,
        today: '2026-08-20',
        paidAt: '2026-08-20',
        paidAmount: 400,
        lateFee: 32,
      }),
    ).toBe('partial');
  });
});

describe('computeLateFee', () => {
  it('fee = due amount × rate, rounded to 2 decimals', () => {
    expect(computeLateFee(750, 0.05)).toBe(37.5);
    expect(computeLateFee(800, 0.04)).toBe(32);
    expect(computeLateFee(550, 0.04)).toBe(22);
  });

  it('grace deadline is dueDate + graceDays (inclusive)', () => {
    expect(isPastGraceDeadline('2026-08-01', 5, '2026-08-06')).toBe(false);
    expect(isPastGraceDeadline('2026-08-01', 5, '2026-08-07')).toBe(true);
  });
});

describe('remainingFor', () => {
  it('computes residual arrears and never returns negative', () => {
    expect(remainingFor({ amount: 800, paidAmount: 300 })).toBe(500);
    expect(remainingFor({ amount: 800, paidAmount: 800 })).toBe(0);
    expect(remainingFor({ amount: 800, paidAmount: 0 })).toBe(800);
  });
});
