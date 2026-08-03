import type { PillTone } from '../shared/ui/status-pill/status-pill';
import type { MaintenanceStatus, PaymentStatus } from '../models/models';

export const eur = (n: number | null | undefined): string =>
  n == null ? '—' : `€${n.toFixed(2)}`;

export const dateFmt = (d: string | null | undefined): string => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[m - 1]} ${y}`;
};

export const paymentTone = (s: PaymentStatus | string): PillTone =>
  s === 'paid' ? 'success' : s === 'partial' ? 'warning' : s === 'overdue' ? 'danger' : s === 'late' ? 'warning' : 'muted';

export const paymentLabel = (s: PaymentStatus | string): string =>
  s === 'paid' ? 'Paid' : s === 'partial' ? 'Partial' : s === 'overdue' ? 'Overdue' : s === 'late' ? 'Late' : 'Due';

export const unitTone = (s: string): PillTone =>
  s === 'occupied' ? 'success' : s === 'available' ? 'muted' : 'warning';

export const leaseTone = (s: string): PillTone =>
  s === 'active' ? 'success' : s === 'draft' ? 'primary' : s === 'expired' ? 'warning' : 'danger';

export const maintTone = (s: MaintenanceStatus | string): PillTone =>
  s === 'resolved' ? 'success' : s === 'in-progress' ? 'primary' : s === 'assigned' ? 'warning' : 'danger';

export const priorityTone = (p: string): PillTone =>
  p === 'high' ? 'danger' : p === 'med' ? 'warning' : 'muted';
