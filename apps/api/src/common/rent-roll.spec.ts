import {
  dueDateForMonth,
  firstDueDate,
  isFirstMonth,
  leaseInMonth,
  monthTotals,
} from './rent-roll';

describe('leaseInMonth', () => {
  it('includes leases intersecting the month', () => {
    expect(leaseInMonth('2026-03-01', '2026-12-31', '2026-08')).toBe(true);
    expect(leaseInMonth('2026-08-15', '2026-12-31', '2026-08')).toBe(true);
    expect(leaseInMonth('2026-01-01', '2026-07-31', '2026-08')).toBe(false);
  });
});

describe('dueDateForMonth', () => {
  it('keeps the lease start day-of-month for later months', () => {
    expect(dueDateForMonth('2026-03-15', 15, '2026-08')).toBe('2026-08-15');
    expect(dueDateForMonth('2026-01-01', 1, '2026-08')).toBe('2026-08-01');
  });

  it('caps at month length (31st start falls on the 30th in a 30-day month)', () => {
    expect(dueDateForMonth('2026-03-31', 31, '2026-04')).toBe('2026-04-30');
    expect(dueDateForMonth('2026-03-31', 31, '2026-02')).toBe('2026-02-28');
  });

  it('first month due date is the lease start itself', () => {
    expect(firstDueDate('2026-08-15')).toBe('2026-08-15');
  });

  it('isFirstMonth matches the lease start month', () => {
    expect(isFirstMonth('2026-08-15', '2026-08-10')).toBe(true);
    expect(isFirstMonth('2026-08-15', '2026-09-01')).toBe(false);
  });
});

describe('monthTotals', () => {
  it('aggregates due, collected and arrears across rows', () => {
    const rows = [
      { amount: 800, paidAmount: 800, status: 'paid' },
      { amount: 850, paidAmount: 0, status: 'overdue' },
      { amount: 700, paidAmount: 350, status: 'partial' },
    ];
    const totals = monthTotals(rows);
    expect(totals.due).toBe(2350);
    expect(totals.collected).toBe(1150);
    expect(totals.arrears).toBe(1200); // 850 + 350
  });

  it('handles an empty roll', () => {
    expect(monthTotals([])).toEqual({ due: 0, collected: 0, arrears: 0 });
  });
});
