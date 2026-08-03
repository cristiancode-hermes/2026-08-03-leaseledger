import { prorateRent } from './proration';
import { daysInMonth, isLeapYear } from './dates';

describe('prorateRent', () => {
  it('prorates mid-month move-in (Aug 15 → 17/31 days)', () => {
    const r = prorateRent(800, 2026, 8, 15);
    expect(r.daysInMonth).toBe(31);
    expect(r.daysOccupied).toBe(17);
    // 800 / 31 * 17 = 438.7096… → 438.71
    expect(r.amount).toBeCloseTo(438.71, 2);
  });

  it('move-in on the 1st charges a full month', () => {
    const r = prorateRent(850, 2026, 1, 1);
    expect(r.daysOccupied).toBe(31);
    expect(r.amount).toBe(850);
  });

  it('handles leap-year February 29 correctly (full month)', () => {
    expect(isLeapYear(2028)).toBe(true);
    expect(daysInMonth(2028, 2)).toBe(29);
    const r = prorateRent(900, 2028, 2, 1);
    expect(r.daysInMonth).toBe(29);
    expect(r.daysOccupied).toBe(29);
    expect(r.amount).toBe(900);
  });

  it('Feb 28 move-in on a non-leap year charges 1/28 days', () => {
    expect(isLeapYear(2026)).toBe(false);
    expect(daysInMonth(2026, 2)).toBe(28);
    const r = prorateRent(840, 2026, 2, 28);
    expect(r.daysInMonth).toBe(28);
    expect(r.daysOccupied).toBe(1);
    // 840 / 28 * 1 = 30
    expect(r.amount).toBe(30);
  });

  it('move-in on Feb 29 of a leap year charges exactly 1 day', () => {
    const r = prorateRent(870, 2028, 2, 29);
    expect(r.daysInMonth).toBe(29);
    expect(r.daysOccupied).toBe(1);
    expect(r.amount).toBeCloseTo(30, 2); // 870/29
  });

  it('clamps out-of-range day and rounds to 2 decimals', () => {
    const r = prorateRent(1000, 2026, 4, 99);
    expect(r.daysInMonth).toBe(30);
    expect(r.daysOccupied).toBe(1);
    expect(r.amount).toBeCloseTo(33.33, 2);
  });
});
