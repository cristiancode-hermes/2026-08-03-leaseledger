import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TenantsService, TenantDetail } from '../../services/tenants.service';
import { ToastService } from '../../services/toast.service';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { eur, dateFmt, leaseTone } from '../../shared/format';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [RouterLink, StatusPill, Skeleton, EmptyState, ConfirmDialog],
  template: `
    @if (loading()) {
      <app-skeleton></app-skeleton>
    } @else if (t()) {
      @let d = t()!;
      <div class="detail-header">
        <div>
          <h1>{{ d.name }}</h1>
          <p class="muted">{{ d.email ?? '—' }} · {{ d.phone ?? '—' }}</p>
        </div>
        <div class="flex gap-3">
          <a class="btn btn-secondary" [routerLink]="['/tenants', d.id, 'edit']">Edit</a>
          <a class="btn btn-primary" [routerLink]="['/leases/new']">＋ New lease</a>
          <button class="btn btn-danger btn-sm" (click)="confirmDelete = true">Delete</button>
        </div>
      </div>

      <div class="info-grid mb-5">
        <div class="info-item"><div class="info-label">NIF</div><div class="info-value mono">{{ d.nif ?? '—' }}</div></div>
        <div class="info-item"><div class="info-label">Emergency contact</div>
          <div class="info-value">{{ d.emergencyContact?.name ?? '—' }}{{ d.emergencyContact?.phone ? ' · ' + d.emergencyContact.phone : '' }}</div>
        </div>
        <div class="info-item"><div class="info-label">Arrears</div>
          <div class="info-value" [style.color]="d.paymentSummary.arrears > 0 ? 'var(--color-danger)' : undefined">
            {{ eur(d.paymentSummary.arrears) }}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Leases</h3></div>
        @if (d.leases.length === 0) {
          <app-empty-state glyph="📄" title="No leases" message="This tenant has no leases yet." ctaLabel="Create lease" (cta)="goLease()" />
        } @else {
          <div class="table-wrap">
            <table class="ll-table">
              <thead><tr><th>Unit</th><th>Property</th><th>Term</th><th>Rent</th><th>Status</th></tr></thead>
              <tbody>
                @for (l of d.leases; track l.id) {
                  <tr class="row-link" [routerLink]="['/leases', l.id]">
                    <td data-label="Unit"><span class="mono">{{ l.unitNumber ?? '—' }}</span></td>
                    <td data-label="Property">{{ l.propertyName ?? '—' }}</td>
                    <td data-label="Term" class="tabular">{{ dateFmt(l.startDate) }} → {{ dateFmt(l.endDate) }}</td>
                    <td data-label="Rent" class="num">{{ eur(l.monthlyRent) }}</td>
                    <td data-label="Status"><app-status-pill [label]="l.effectiveStatus" [tone]="leaseTone(l.effectiveStatus)" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    @if (confirmDelete) {
      <app-confirm-dialog
        title="Delete this tenant?"
        message="Their leases stay on record but are unlinked."
        confirmLabel="Delete"
        [danger]="true"
        (confirm)="deleteTenant()"
        (cancel)="confirmDelete = false"
      />
    }
  `,
})
export class TenantDetailPage extends FormatBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(TenantsService);
  private readonly toasts = inject(ToastService);

  readonly t = signal<TenantDetail | null>(null);
  readonly loading = signal(true);
  confirmDelete = false;
  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    void this.svc
      .get(this.id)
      .then((d) => this.t.set(d))
      .catch(() => this.toasts.show('Could not load tenant', 'danger'))
      .finally(() => this.loading.set(false));
  }

  goLease(): void {
    void this.router.navigate(['/leases/new']);
  }

  async deleteTenant(): Promise<void> {
    try {
      await this.svc.remove(this.id);
      this.toasts.show('Tenant deleted');
      await this.router.navigate(['/tenants']);
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.toasts.show(err.error?.message ?? 'Could not delete tenant', 'danger');
      this.confirmDelete = false;
    }
  }
}
