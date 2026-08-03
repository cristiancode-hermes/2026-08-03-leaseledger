import {
  canRenew,
  canTerminate,
  leaseStatusOn,
  rangesOverlap,
} from './lease-rules';

describe('rangesOverlap', () => {
  it('detects full containment overlap', () => {
    expect(rangesOverlap('2026-03-01', '2026-12-31', '2026-06-01', '2026-08-01')).toBe(true);
  });

  it('detects partial overlap', () => {
    expect(rangesOverlap('2026-01-01', '2026-06-30', '2026-06-15', '2026-12-31')).toBe(true);
  });

  it('touching dates are NOT an overlap (end == next start)', () => {
    expect(rangesOverlap('2026-01-01', '2026-06-30', '2026-07-01', '2026-12-31')).toBe(false);
  });

  it('disjoint ranges do not overlap', () => {
    expect(rangesOverlap('2026-01-01', '2026-03-31', '2026-06-01', '2026-12-31')).toBe(false);
  });

  it('same exact day IS an overlap (double-booking protection)', () => {
    expect(rangesOverlap('2026-08-15', '2026-08-15', '2026-08-15', '2026-08-15')).toBe(true);
  });
});

describe('leaseStatusOn', () => {
  it('auto-expires an active lease whose end date passed', () => {
    expect(leaseStatusOn('active', '2026-01-01', '2026-07-31', '2026-08-03')).toBe('expired');
  });

  it('keeps an active lease active while within range', () => {
    expect(leaseStatusOn('active', '2026-01-01', '2026-12-31', '2026-08-03')).toBe('active');
  });

  it('activates a draft lease on its start date', () => {
    expect(leaseStatusOn('draft', '2026-08-03', '2026-12-31', '2026-08-03')).toBe('active');
  });

  it('keeps a future draft draft', () => {
    expect(leaseStatusOn('draft', '2026-09-01', '2027-08-31', '2026-08-03')).toBe('draft');
  });

  it('terminal states never resurrect', () => {
    expect(leaseStatusOn('terminated', '2026-01-01', '2026-12-31', '2026-08-03')).toBe('terminated');
    expect(leaseStatusOn('expired', '2026-01-01', '2026-06-30', '2026-01-15')).toBe('expired');
  });
});

describe('lease transitions', () => {
  it('only active leases can be renewed', () => {
    expect(canRenew('active')).toBe(true);
    expect(canRenew('draft')).toBe(false);
    expect(canRenew('expired')).toBe(false);
    expect(canRenew('terminated')).toBe(false);
  });

  it('cannot terminate an already terminated/expired lease', () => {
    expect(canTerminate('active')).toBe(true);
    expect(canTerminate('draft')).toBe(true);
    expect(canTerminate('expired')).toBe(false);
    expect(canTerminate('terminated')).toBe(false);
  });
});
