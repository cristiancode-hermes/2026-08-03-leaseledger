import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentsService } from '../../services/payments.service';
import { ToastService } from '../../services/toast.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { MonthPicker } from '../../shared/ui/month-picker/month-picker';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Modal } from '../../shared/ui/modal/modal';
import { eur, dateFmt, monthLabel, paymentTone, paymentLabel } from '../../shared/format';
import type { RentRollRow } from '../../models/models';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [PageHeader, MonthPicker, Skeleton, EmptyState, StatusPill, Modal, FormsModule],
  template: `
    <app-page-header title="Rent roll" subtitle="Who has paid, who hasn't.">
      <button class="btn btn-secondary" (click)="exportCsv()">Export CSV</button>
    </app-page-header>

    <div class="flex justify-between items-center mb-5 flex-wrap gap-3">
      <app-month-picker (monthChange)="onMonth($event)" #picker></app-month-picker>
      <div class="flex gap-4">
        <span class="small muted">Due <strong class="tabular">{{ eur(totals().due) }}</strong></span>
        <span class="small muted">Collected <strong class="tabular" style="color: var(--color-success)">{{ eur(totals().collected) }}</strong></span>
        <span class="small muted">Arrears <strong class="tabular" style="color: var(--color-danger)">{{ eur(totals().arrears) }}</strong></span>
      </div>
    </div>

    @if (svc.loading()) {
      <app-skeleton></app-skeleton>
    } @else if (svc.error()) {
      <div class="alert alert-danger">{{ svc.error() }}</div>
    } @else if (rows().length === 0) {
      <app-empty-state glyph="€" title="Nothing due this month" message="No active leases intersect this month." />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="ll-table">
            <thead>
              <tr><th>Unit</th><th>Property</th><th>Tenant</th><th>Due date</th><th>Amount</th><th>Paid</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              @for (r of rows(); track $index) {
                <tr [style.background]="r.status === 'overdue' || r.status === 'late' ? 'var(--tint-danger)' : r.status === 'partial' ? 'var(--tint-warning)' : ''">
                  <td data-label="Unit"><span class="mono">{{ r.unitNumber }}</span></td>
                  <td data-label="Property">{{ r.propertyName }}</td>
                  <td data-label="Tenant">{{ r.tenantName }}</td>
                  <td data-label="Due date" class="tabular">{{ dateFmt(r.dueDate) }}</td>
                  <td data-label="Amount" class="num">{{ eur(r.amount) }}{{ r.lateFee ? ' + ' + eur(r.lateFee) + ' fee' : '' }}</td>
                  <td data-label="Paid" class="num">{{ r.paidAt ? eur(r.paidAmount) : '—' }}</td>
                  <td data-label="Status"><app-status-pill [label]="paymentLabel(r.status)" [tone]="paymentTone(r.status)" /></td>
                  <td data-label="">
                    <button class="btn btn-ghost btn-sm" (click)="openRecord(r)">Record</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    @if (selected()) {
      <app-modal title="Record payment" (close)="selected.set(null)">
        @if (recordError()) {
          <div class="alert alert-danger mb-4">{{ recordError() }}</div>
        }
        @let r = selected()!;
        <p class="small muted mb-4">{{ r.tenantName }} · <span class="mono">{{ r.unitNumber }}</span> · due {{ dateFmt(r.dueDate) }} · {{ eur(r.amount) }}</p>
        <div class="field">
          <label for="paid">Amount paid</label>
          <div class="money-input-wrap">
            <span class="prefix">€</span>
            <input id="paid" class="input" type="number" min="0" [ngModel]="paidAmount()" (ngModelChange)="paidAmount.set($event)" name="paid" />
          </div>
        </div>
        <div class="field">
          <label for="method">Method</label>
          <select id="method" class="select" [(ngModel)]="method" name="method">
            <option value="transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </div>
        <div class="field">
          <label for="pdate">Payment date</label>
          <input id="pdate" class="input" type="date" [(ngModel)]="paidDate" name="pdate" />
        </div>
        <div class="flex justify-between">
          <button class="btn btn-secondary" (click)="selected.set(null)">Cancel</button>
          <button class="btn btn-primary" [disabled]="saving()" (click)="savePayment()">
            {{ saving() ? 'Saving…' : 'Save payment' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class PaymentsPage extends FormatBase implements OnInit {
  readonly svc = inject(PaymentsService);
  private readonly toasts = inject(ToastService);

  readonly roll = this.svc.roll;
  readonly selected = signal<RentRollRow | null>(null);
  readonly paidAmount = signal(0);
  readonly method = signal('transfer');
  readonly paidDate = signal('');
  readonly saving = signal(false);
  readonly recordError = signal<string | null>(null);

  ngOnInit(): void {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    void this.svc.loadRoll(month);
  }

  onMonth(month: string): void {
    void this.svc.loadRoll(month);
  }

  totals(): { due: number; collected: number; arrears: number } {
    return this.roll()?.totals ?? { due: 0, collected: 0, arrears: 0 };
  }

  rows(): RentRollRow[] {
    return this.roll()?.rows ?? [];
  }

  openRecord(row: RentRollRow): void {
    this.selected.set(row);
    this.paidAmount.set(row.amount);
    this.paidDate.set(new Date().toISOString().slice(0, 10));
    this.method.set(row.method ?? 'transfer');
    this.recordError.set(null);
  }

  async savePayment(): Promise<void> {
    const r = this.selected();
    if (!r) return;
    this.saving.set(true);
    this.recordError.set(null);
    try {
      const paymentId = r.paymentId;
      if (paymentId) {
        await this.svc.patch(paymentId, {
          paidDate: this.paidDate() || null,
          method: this.method(),
          paidAmount: this.paidAmount(),
        });
      } else {
        await this.svc.record({
          leaseId: r.leaseId,
          dueDate: r.dueDate,
          amount: r.amount,
          method: this.method(),
          paidDate: this.paidDate() || undefined,
        });
      }
      this.toasts.show('Payment recorded');
      this.selected.set(null);
      const month = this.roll()?.month ?? '';
      if (month) await this.svc.loadRoll(month);
    } catch (e) {
      const err = e as { error?: { message?: string | string[] } };
      const m = err.error?.message;
      this.recordError.set(Array.isArray(m) ? m.join('. ') : (m ?? 'Could not save payment'));
    } finally {
      this.saving.set(false);
    }
  }

  async exportCsv(): Promise<void> {
    const month = this.roll()?.month;
    if (!month) return;
    try {
      await this.svc.downloadCsv(month);
      this.toasts.show(`Exported rent roll ${monthLabel(month)}`);
    } catch {
      this.toasts.show('Export failed', 'danger');
    }
  }
}
