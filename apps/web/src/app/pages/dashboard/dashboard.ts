import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { PropertiesService } from '../../services/properties.service';
import { KpiTile } from '../../shared/ui/kpi-tile/kpi-tile';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { eur, dateFmt, leaseTone, paymentTone, paymentLabel, maintTone, priorityTone } from '../../shared/format';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, KpiTile, StatusPill, Skeleton, EmptyState],
  template: `
    <div class="page-header">
      <div>
        <h1>Overview</h1>
        <p class="subtitle">Your portfolio at a glance.</p>
      </div>
      <a class="btn btn-primary" routerLink="/leases/new">＋ New lease</a>
    </div>

    @if (dash.loading()) {
      <app-skeleton></app-skeleton>
    } @else if (dash.error()) {
      <div class="alert alert-danger">{{ dash.error() }}</div>
    } @else if (d()) {
      <div class="kpi-grid mb-5">
        <app-kpi-tile label="Rent due · this month" [value]="eur(d()!.kpis.rentDue)" hint="Across active leases" />
        <app-kpi-tile label="Collected" [value]="eur(d()!.kpis.collected)" hint="All-time" color="var(--color-success)" />
        <app-kpi-tile label="Overdue" [value]="eur(d()!.kpis.overdue)" hint="Past grace deadline" color="var(--color-danger)" />
        <app-kpi-tile label="Occupancy" [value]="d()!.kpis.occupancy + '%'" hint="Of your units" />
      </div>

      <div class="grid-12">
        <div class="col-span-8">
          <div class="card">
            <div class="card-header">
              <h3>Unpaid this month</h3>
            </div>
            @if (d()!.unpaidUnits.length === 0) {
              <app-empty-state glyph="✓" title="All paid" message="No outstanding rent this month." />
            } @else {
              <div class="table-wrap">
                <table class="ll-table">
                  <thead>
                    <tr><th>Unit</th><th>Tenant</th><th>Due</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    @for (u of d()!.unpaidUnits; track u.leaseId) {
                      <tr class="row-link" [routerLink]="['/leases', u.leaseId]">
                        <td data-label="Unit"><span class="mono">{{ u.unitNumber }}</span></td>
                        <td data-label="Tenant">{{ u.tenantName }}</td>
                        <td data-label="Due" class="tabular">{{ dateFmt(u.dueDate) }}</td>
                        <td data-label="Amount" class="num">{{ eur(u.amount) }}</td>
                        <td data-label="Status"><app-status-pill [label]="paymentLabel(u.status)" [tone]="paymentTone(u.status)" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div class="card">
            <div class="card-header">
              <h3>Open maintenance</h3>
              <a class="small" routerLink="/maintenance">View all →</a>
            </div>
            @if (d()!.openMaintenance.length === 0) {
              <app-empty-state glyph="⚒" title="Nothing in the queue" message="No open maintenance requests." />
            } @else {
              <div class="table-wrap">
                <table class="ll-table">
                  <thead>
                    <tr><th>Unit</th><th>Issue</th><th>Priority</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    @for (m of d()!.openMaintenance; track m.id) {
                      <tr>
                        <td data-label="Unit"><span class="mono">{{ m.unitNumber }}</span></td>
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
            <div class="card-header">
              <h3>Expiring leases</h3>
              <span class="label">next 60 days</span>
            </div>
            @if (d()!.expiringLeases.length === 0) {
              <app-empty-state glyph="🗓" title="All settled" message="No leases expire in the next 60 days." />
            } @else {
              <div class="timeline">
                @for (e of d()!.expiringLeases; track e.leaseId) {
                  <div class="timeline-item">
                    <div class="flex justify-between items-center">
                      <a [routerLink]="['/leases', e.leaseId]" class="small" style="font-weight: 600">{{ e.unitNumber }} · {{ e.tenantName }}</a>
                      <app-status-pill label="{{ e.daysLeft }}d left" [tone]="e.daysLeft <= 30 ? 'danger' : 'warning'" />
                    </div>
                    <div class="small muted">{{ dateFmt(e.endDate) }}</div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="card">
            <div class="card-header"><h3>Properties</h3><a class="small" routerLink="/properties">View all →</a></div>
            @if (props.state().loading) {
              <div class="skeleton skeleton-line" style="width: 80%"></div>
            } @else {
              @for (p of props.state().data; track p.id) {
                <div class="flex justify-between items-center py-1">
                  <a [routerLink]="['/properties', p.id]" class="small">{{ p.name }}</a>
                  <span class="small muted tabular">{{ p.occupiedCount }}/{{ p.unitCount }} units</span>
                </div>
              } @empty {
                <app-empty-state glyph="⌂" title="No properties yet" message="Add your first property to get started." />
              }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardPage extends FormatBase implements OnInit {
  readonly dash = inject(DashboardService);
  readonly props = inject(PropertiesService);
  readonly d = computed(() => this.dash.data());

  ngOnInit(): void {
    void this.dash.load();
    void this.props.load();
  }
}
