import { canTransition, isActionable, MAINTENANCE_TRANSITIONS } from './maintenance-rules';

describe('maintenance state machine', () => {
  it('allows only the sequential transitions', () => {
    expect(canTransition('open', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'in-progress')).toBe(true);
    expect(canTransition('in-progress', 'resolved')).toBe(true);
  });

  it('rejects jumps', () => {
    expect(canTransition('open', 'in-progress')).toBe(false);
    expect(canTransition('open', 'resolved')).toBe(false);
    expect(canTransition('assigned', 'resolved')).toBe(false);
  });

  it('rejects backward transitions', () => {
    expect(canTransition('assigned', 'open')).toBe(false);
    expect(canTransition('in-progress', 'assigned')).toBe(false);
    expect(canTransition('resolved', 'in-progress')).toBe(false);
  });

  it('resolved is terminal', () => {
    expect(MAINTENANCE_TRANSITIONS.resolved).toHaveLength(0);
    expect(isActionable('resolved')).toBe(false);
    expect(isActionable('open')).toBe(true);
  });
});
