import { Component, inject, OnInit, signal } from '@angular/core';
import { DashboardService, MyLeaseData } from '../../services/dashboard.service';
import { MaintenanceService } from '../../services/maintenance.service';
import type { MaintenanceRequest, RentPayment } from '../../models/models';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Modal } from '../../shared/ui/modal/modal';
import { ToastService } from '../../services/toast.service';
import { eur, dateFmt, paymentTone, paymentLabel, maintTone, priorityTone } from '../../shared/format';
import { FormsModule } from '@angular/forms';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-my-lease',
  standalone: true,
  imports: [StatusPill, Skeleton, EmptyState, Modal, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>My lease</h1>
        <p class="subtitle">Your home at a glance.</p>
      </div>
      <button class="btn btn-primary" (click)="showReport = true">Report an issue</button>
    </div>

    @if (loading()) {
      <app-skeleton></app-skeleton>
    } @else if (!data()?.lease) {
      <app-empty-state glyph="⌂" title="No active lease" message="There is no active lease linked to this account." />
    } @else {
      @let l = data()!.lease!;
      <div class="card mb-5">
        <div class="detail-header">
          <div>
            <div class="flex gap-3 items-center">
              <h2>{{ l.propertyName }} · <span class="mono">{{ l.unitNumber }}</span></h2>
              <app-status-pill [label]="l.effectiveStatus" [tone]="l.effectiveStatus === 'active' ? 'success' : 'warning'" />
            </div>
            <p class="muted mt-2">{{ dateFmt(l.startDate) }} → {{ dateFmt(l.endDate) }}</p>
          </div>
          <div class="kpi-tile" style="min-width: 180px">
            <div class="kpi-label">Monthly rent</div>
            <div class="kpi-value">{{ eur(l.monthlyRent) }}</div>
            <div class="kpi-hint">Deposit {{ eur(l.deposit) }}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item"><div class="info-label">Next payment due</div>
            <div class="info-value">{{ nextDue() ? dateFmt(nextDue()!.dueDate) + ' · ' + eur(nextDue()!.amount) : '—' }}</div>
          </div>
          <div class="info-item"><div class="info-label">Terms include</div>
            <div class="info-value">{{ termsText() }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Payment history</h3></div>
        <div class="table-wrap">
          <table class="ll-table">
            <thead><tr><th>Due date</th><th>Amount</th><th>Paid</th><th>Status</th><th>Method</th></tr></thead>
            <tbody>
              @for (p of data()!.payments; track p.id) {
                <tr>
                  <td data-label="Due" class="tabular">{{ dateFmt(p.dueDate) }}</td>
                  <td data-label="Amount" class="num">{{ eur(p.amount) }}</td>
                  <td data-label="Paid" class="num">{{ p.paidAt ? eur(p.paidAmount) : '—' }}</td>
                  <td data-label="Status"><app-status-pill [label]="paymentLabel(p.status)" [tone]="paymentTone(p.status)" /></td>
                  <td data-label="Method">{{ p.method ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>My maintenance requests</h3></div>
        @if (myRequests().length === 0) {
          <app-empty-state glyph="⚒" title="All quiet" message="You have not reported any issues." />
        } @else {
          <div class="table-wrap">
            <table class="ll-table">
              <thead><tr><th>Issue</th><th>Category</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                @for (m of myRequests(); track m.id) {
                  <tr>
                    <td data-label="Issue">{{ m.description }}</td>
                    <td data-label="Category">{{ m.category }}</td>
                    <td data-label="Priority"><app-status-pill [label]="m.priority" [tone]="priorityTone(m.priority)" /></td>
                    <td data-label="Status"><app-status-pill [label]="m.status" [tone]="maintTone(m.status)" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    @if (showReport) {
      <app-modal title="Report an issue" (close)="showReport = false">
        @if (reportError()) {
          <div class="alert alert-danger mb-4">{{ reportError() }}</div>
        }
        <div class="field">
          <label for="cat">Category</label>
          <select id="cat" class="select" [(ngModel)]="reportCategory">
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="heating">Heating</option>
            <option value="appliance">Appliance</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="field">
          <label for="priority">Priority</label>
          <select id="priority" class="select" [(ngModel)]="reportPriority">
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="field">
          <label for="desc">Describe the issue</label>
          <textarea id="desc" class="textarea" [(ngModel)]="reportDescription" placeholder="What's wrong?"></textarea>
        </div>
        <div class="flex justify-between">
          <button class="btn btn-secondary" (click)="showReport = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="reporting()" (click)="submitReport()">
            {{ reporting() ? 'Sending…' : 'Report issue' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class MyLeasePage extends FormatBase implements OnInit {
  private readonly dash = inject(DashboardService);
  private readonly maint = inject(MaintenanceService);
  private readonly toasts = inject(ToastService);

  readonly data = signal<MyLeaseData | null>(null);
  readonly loading = signal(true);
  readonly myRequests = signal<MaintenanceRequest[]>([]);

  showReport = false;
  readonly reportCategory = signal('plumbing');
  readonly reportPriority = signal('med');
  readonly reportDescription = signal('');
  readonly reportError = signal<string | null>(null);
  readonly reporting = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.dash.myLease();
      this.data.set(data);
      const reqs = await this.maint.mine();
      this.myRequests.set(reqs);
    } catch {
      this.data.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  nextDue(): RentPayment | null {
    return this.data()?.nextDue ?? null;
  }

  termsText(): string {
    const terms = this.data()?.lease?.terms as { includes?: string[]; pets?: boolean; notes?: string } | null | undefined;
    if (!terms) return '—';
    const parts = [...(terms.includes ?? [])];
    if (terms.pets) parts.push('pets allowed');
    return parts.length ? parts.join(', ') : '—';
  }

  async submitReport(): Promise<void> {
    const lease = this.data()?.lease as { unitId?: string } | null | undefined;
    if (!lease?.unitId) {
      this.reportError.set('No active unit linked to this lease');
      return;
    }
    this.reporting.set(true);
    this.reportError.set(null);
    try {
      await this.maint.create({
        unitId: lease.unitId,
        category: this.reportCategory(),
        priority: this.reportPriority(),
        description: this.reportDescription() || 'Issue reported by tenant',
      });
      this.showReport = false;
      this.toasts.show('Issue reported — we will get back to you');
      await this.load();
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.reportError.set(err.error?.message ?? 'Could not report the issue');
    } finally {
      this.reporting.set(false);
    }
  }
}
