import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeasesService, LeaseDetail } from '../../services/leases.service';
import { ToastService } from '../../services/toast.service';
import type { RentPayment, MaintenanceRequest } from '../../models/models';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { eur, dateFmt, leaseTone, paymentTone, paymentLabel, maintTone, priorityTone } from '../../shared/format';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-lease-detail',
  standalone: true,
  imports: [RouterLink, StatusPill, Skeleton, EmptyState, ConfirmDialog, FormsModule],
  template: `
    @if (loading()) {
      <app-skeleton></app-skeleton>
    } @else if (l()) {
      @let d = l()!;
      <div class="detail-header">
        <div>
          <div class="flex gap-3 items-center">
            <h1>Lease · <span class="mono">{{ d.unitNumber }}</span></h1>
            <app-status-pill [label]="d.effectiveStatus" [tone]="leaseTone(d.effectiveStatus)" />
          </div>
          <p class="muted">{{ d.tenantName }} · {{ d.propertyName }}</p>
        </div>
        <div class="flex gap-3">
          @if (d.effectiveStatus === 'active') {
            <button class="btn btn-secondary" (click)="showRenew = true">Renew</button>
            <button class="btn btn-danger" (click)="confirmTerminate = true">Terminate</button>
          }
          <a class="btn btn-secondary" routerLink="/dashboard">Back</a>
        </div>
      </div>

      <div class="info-grid mb-5">
        <div class="info-item"><div class="info-label">Term</div><div class="info-value tabular">{{ dateFmt(d.startDate) }} → {{ dateFmt(d.endDate) }}</div></div>
        <div class="info-item"><div class="info-label">Monthly rent</div><div class="info-value">{{ eur(d.monthlyRent) }}</div></div>
        <div class="info-item"><div class="info-label">Deposit</div><div class="info-value">{{ eur(d.deposit) }}</div></div>
        @if (d.proratedFirstMonth) {
          <div class="info-item"><div class="info-label">First month (prorated)</div>
            <div class="info-value">{{ eur(d.proratedFirstMonth.amount) }} · {{ d.proratedFirstMonth.daysOccupied }}/{{ d.proratedFirstMonth.daysInMonth }} days</div>
          </div>
        }
      </div>

      <div class="grid-12">
        <div class="col-span-8">
          <div class="card">
            <div class="card-header"><h3>Payments</h3></div>
            @if (payments().length === 0) {
              <app-empty-state glyph="€" title="No payments yet" message="The first payment is created when the lease starts." />
            } @else {
              <div class="table-wrap">
                <table class="ll-table">
                  <thead><tr><th>Due date</th><th>Amount</th><th>Paid</th><th>Late fee</th><th>Status</th><th>Method</th></tr></thead>
                  <tbody>
                    @for (p of payments(); track p.id) {
                      <tr>
                        <td data-label="Due" class="tabular">{{ dateFmt(p.dueDate) }}</td>
                        <td data-label="Amount" class="num">{{ eur(p.amount) }}</td>
                        <td data-label="Paid" class="num">{{ p.paidAt ? eur(p.paidAmount) : '—' }}</td>
                        <td data-label="Late fee" class="num">{{ p.lateFee ? eur(p.lateFee) : '—' }}</td>
                        <td data-label="Status"><app-status-pill [label]="paymentLabel(p.status)" [tone]="paymentTone(p.status)" /></td>
                        <td data-label="Method">{{ p.method ?? '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div class="card">
            <div class="card-header"><h3>Maintenance</h3></div>
            @if (maintenance().length === 0) {
              <app-empty-state glyph="⚒" title="No requests" message="Nothing reported on this lease." />
            } @else {
              <div class="table-wrap">
                <table class="ll-table">
                  <thead><tr><th>Issue</th><th>Priority</th><th>Status</th></tr></thead>
                  <tbody>
                    @for (m of maintenance(); track m.id) {
                      <tr>
                        <td data-label="Issue">{{ m.description }}</td>
                        <td data-label="Priority"><app-status-pill [label]="m.priority" [tone]="priorityTone(m.priority)" /></td>
                        <td data-label="Status"><app-status-pill [label]="m.status" [tone]="maintTone(m.status)" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>

        <div class="col-span-4">
          <div class="card">
            <div class="card-header"><h3>Tenant</h3></div>
            <p style="font-weight: 600">{{ d.tenantName }}</p>
            <p class="small muted">Unit <span class="mono">{{ d.unitNumber }}</span> · {{ d.propertyName }}</p>
          </div>
        </div>
      </div>
    }

    @if (showRenew) {
      <app-confirm-dialog
        title="Renew lease"
        message="Extend this lease by one year from its current end date."
        confirmLabel="Renew"
        (confirm)="renew()"
        (cancel)="showRenew = false"
      />
    }

    @if (confirmTerminate) {
      <app-confirm-dialog
        title="Terminate lease?"
        message="The unit will be marked available and the lease becomes terminated."
        confirmLabel="Terminate"
        [danger]="true"
        (confirm)="terminate()"
        (cancel)="confirmTerminate = false"
      />
    }
  `,
})
export class LeaseDetailPage extends FormatBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leases = inject(LeasesService);
  private readonly toasts = inject(ToastService);

  readonly l = signal<LeaseDetail | null>(null);
  readonly loading = signal(true);
  showRenew = false;
  confirmTerminate = false;
  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    void this.leases
      .get(this.id)
      .then((d) => this.l.set(d))
      .catch(() => this.toasts.show('Could not load lease', 'danger'))
      .finally(() => this.loading.set(false));
  }

  async renew(): Promise<void> {
    const current = this.l();
    if (!current) return;
    const currentEnd = new Date(current.endDate + 'T00:00:00Z');
    const nextEnd = new Date(currentEnd);
    nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    const endDate = nextEnd.toISOString().slice(0, 10);
    try {
      const updated = await this.leases.renew(this.id, { endDate });
      this.l.set(updated);
      this.showRenew = false;
      this.toasts.show(`Lease renewed until ${dateFmt(endDate)}`);
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.toasts.show(err.error?.message ?? 'Could not renew', 'danger');
    }
  }

  async terminate(): Promise<void> {
    try {
      const updated = await this.leases.terminate(this.id);
      this.l.set(updated);
      this.confirmTerminate = false;
      this.toasts.show('Lease terminated');
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.toasts.show(err.error?.message ?? 'Could not terminate', 'danger');
      this.confirmTerminate = false;
    }
  }

  payments(): RentPayment[] {
    return (this.l()?.payments ?? []) as RentPayment[];
  }

  maintenance(): MaintenanceRequest[] {
    return (this.l()?.maintenance ?? []) as MaintenanceRequest[];
  }
}
