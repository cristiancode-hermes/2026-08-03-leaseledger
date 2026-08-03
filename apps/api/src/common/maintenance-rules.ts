export type MaintenanceStatus =
  | 'open'
  | 'assigned'
  | 'in-progress'
  | 'resolved';

/** Valid maintenance state machine (no jumps allowed): open → assigned → in-progress → resolved. */
export const MAINTENANCE_TRANSITIONS: Record<
  MaintenanceStatus,
  MaintenanceStatus[]
> = {
  open: ['assigned'],
  assigned: ['in-progress'],
  'in-progress': ['resolved'],
  resolved: [],
};

export function canTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): boolean {
  return MAINTENANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Whether a request is still actionable (not resolved). */
export function isActionable(status: MaintenanceStatus): boolean {
  return status !== 'resolved';
}
