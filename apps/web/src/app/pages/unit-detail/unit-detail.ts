import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UnitsService } from '../../services/units.service';
import { ToastService } from '../../services/toast.service';
import type { RentPayment, MaintenanceRequest } from '../../models/models';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { eur, dateFmt, unitTone, paymentTone, paymentLabel, maintTone, priorityTone } from '../../shared/format';
import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [RouterLink, StatusPill, Skeleton, EmptyState],
  template: `
    @if (loading()) {
      <app-skeleton></app-skeleton>
    } @else if (data()) {
      @let d = data()!;
      <div class="detail-header">
        <div>
          <div class="flex gap-3 items-center">
            <h1>Unit <span class="mono">{{ d.unit.number }}</span></h1>
            <app-status-pill [label]="d.unit.status" [tone]="unitTone(d.unit.status)" />
          </div>
          <p class="muted"><a [routerLink]="['/properties', d.property.id]">{{ d.property.name }}</a></p>
        </div>
        <div class="flex gap-3">
          <a class="btn btn-primary" [routerLink]="['/leases/new']">＋ New lease</a>
        </div>
      </div>

      <div class="info-grid mb-5">
        <div class="info-item"><div class="info-label">Rent</div><div class="info-value">{{ eur(d.unit.monthlyRent) }}</div></div>
        <div class="info-item"><div class="info-label">Bedrooms</div><div class="info-value">{{ d.unit.bedrooms }}</div></div>
        <div class="info-item"><div class="info-label">Bathrooms</div><div class="info-value">{{ d.unit.bathrooms }}</div></div>
        <div class="info-item"><div class="info-label">Area</div><div class="info-value">{{ d.unit.area }} m²</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Current lease</h3></div>
        @if (d.currentLease) {
          <div class="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div class="flex gap-3 items-center">
                <a [routerLink]="['/leases', d.currentLease.id]" style="font-weight: 600">
                  {{ d.currentLease.tenant?.name ?? 'Tenant' }}
                </a>
                <app-status-pill [label]="d.currentLease.effectiveStatus" [tone]="d.currentLease.effectiveStatus === 'active' ? 'success' : 'warning'" />
              </div>
              <p class="small muted mt-2">{{ dateFmt(d.currentLease.startDate) }} → {{ dateFmt(d.currentLease.endDate) }} · {{ eur(d.currentLease.monthlyRent) }}/mo</p>
            </div>
          </div>
        } @else {
          <app-empty-state glyph="▭" title="No active lease" message="This unit is ready to rent." ctaLabel="Create lease" (cta)="goLease()" />
        }
      </div>

      <div class="grid-12">
        <div class="col-span-6">
          <div class="card">
            <div class="card-header"><h3>Payment history</h3></div>
            @if (paymentHistory().length === 0) {
              <app-empty-state glyph="€" title="No payments yet" message="Payments appear once a lease starts." />
            } @else {
              <div class="table-wrap">
                <table class="ll-table">
                  <thead><tr><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    @for (p of paymentHistory(); track p.id) {
                      <tr>
                        <td data-label="Due" class="tabular">{{ dateFmt(p.dueDate) }}</td>
                        <td data-label="Amount" class="num">{{ eur(p.amount) }}</td>
                        <td data-label="Status"><app-status-pill [label]="paymentLabel(p.status)" [tone]="paymentTone(p.status)" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
        <div class="col-span-6">
          <div class="card">
            <div class="card-header"><h3>Maintenance</h3></div>
            @if (maintenanceHistory().length === 0) {
              <app-empty-state glyph="⚒" title="No requests" message="No maintenance history for this unit." />
            } @else {
              <div class="table-wrap">
                <table class="ll-table">
                  <thead><tr><th>Issue</th><th>Priority</th><th>Status</th></tr></thead>
                  <tbody>
                    @for (m of maintenanceHistory(); track m.id) {
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
      </div>
    }
  `,
})
export class UnitDetailPage extends FormatBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly unitsSvc = inject(UnitsService);
  private readonly toasts = inject(ToastService);

  readonly data = signal<Awaited<ReturnType<UnitsService['get']>> | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    void this.unitsSvc
      .get(id)
      .then((d) => this.data.set(d))
      .catch(() => this.toasts.show('Could not load unit', 'danger'))
      .finally(() => this.loading.set(false));
  }

  goLease(): void {
    void this.router.navigate(['/leases/new']);
  }

  paymentHistory(): RentPayment[] {
    return (this.data()?.paymentHistory ?? []) as RentPayment[];
  }

  maintenanceHistory(): MaintenanceRequest[] {
    return (this.data()?.maintenance ?? []) as MaintenanceRequest[];
  }
}
