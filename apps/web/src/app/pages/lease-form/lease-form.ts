import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeasesService } from '../../services/leases.service';
import { PropertiesService } from '../../services/properties.service';
import { UnitsService } from '../../services/units.service';
import { TenantsService } from '../../services/tenants.service';
import { ToastService } from '../../services/toast.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { eur, dateFmt } from '../../shared/format';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-lease-form',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader],
  template: `
    <app-page-header title="New lease" subtitle="Proration and overlap checks run as you type.">
      <a class="btn btn-secondary" routerLink="/dashboard">Back</a>
    </app-page-header>

    <div class="card" style="max-width: 640px">
      @if (error()) {
        <div class="alert alert-danger mb-4">{{ error() }}</div>
      }
      <form (ngSubmit)="submit()" #f="ngForm">
        <div class="grid-12">
          <div class="field" style="grid-column: span 6">
            <label for="property">Property</label>
            <select id="property" class="select" [(ngModel)]="propertyId" name="property" (ngModelChange)="onPropertyChange()">
              <option [ngValue]="null" disabled>Select property…</option>
              @for (p of props.state().data; track p.id) {
                <option [ngValue]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="unit">Unit</label>
            <select id="unit" class="select" [(ngModel)]="unitId" name="unit">
              <option [ngValue]="null" disabled>Select unit…</option>
              @for (u of units(); track u.id) {
                <option [ngValue]="u.id">{{ u.number }} — {{ eur(u.monthlyRent) }}/mo ({{ u.status }})</option>
              }
            </select>
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="tenant">Tenant</label>
            <select id="tenant" class="select" [(ngModel)]="tenantId" name="tenant">
              <option [ngValue]="null" disabled>Select tenant…</option>
              @for (t of tenants.state().data; track t.id) {
                <option [ngValue]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>
          <div class="field" style="grid-column: span 3">
            <label for="start">Start date</label>
            <input id="start" class="input" type="date" [(ngModel)]="startDate" name="start" (ngModelChange)="recheck()" />
          </div>
          <div class="field" style="grid-column: span 3">
            <label for="end">End date</label>
            <input id="end" class="input" type="date" [(ngModel)]="endDate" name="end" (ngModelChange)="recheck()" />
          </div>
          <div class="field" style="grid-column: span 3">
            <label for="rent">Monthly rent</label>
            <div class="money-input-wrap">
              <span class="prefix">€</span>
              <input id="rent" class="input" type="number" min="0" [(ngModel)]="monthlyRent" name="rent" />
            </div>
          </div>
          <div class="field" style="grid-column: span 3">
            <label for="deposit">Deposit</label>
            <div class="money-input-wrap">
              <span class="prefix">€</span>
              <input id="deposit" class="input" type="number" min="0" [(ngModel)]="deposit" name="deposit" />
            </div>
          </div>
        </div>

        @if (overlap()) {
          <div class="alert alert-warning mb-4">
            ⚠ This unit already has a lease on {{ dateFmt(overlap()!.conflicting?.startDate) }} →
            {{ dateFmt(overlap()!.conflicting?.endDate) }} ({{ overlap()!.conflicting?.tenant?.name }}). The dates overlap — pick another range.
          </div>
        }

        @if (prorated() && !overlap()) {
          <div class="alert alert-success mb-4">
            First month: move-in on the {{ startDay() }}th → {{ eur(prorated()!.amount) }}
            ({{ prorated()!.daysOccupied }}/{{ prorated()!.daysInMonth }} days).
            Due on {{ dateFmt(startDate()) }}.
          </div>
        }

        <div class="flex justify-between mt-4">
          <a class="btn btn-secondary" routerLink="/dashboard">Cancel</a>
          <button class="btn btn-primary" type="submit" [disabled]="saving() || !!overlap()">
            {{ saving() ? 'Creating…' : 'Create lease' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class LeaseFormPage extends FormatBase implements OnInit {
  private readonly leases = inject(LeasesService);
  readonly props = inject(PropertiesService);
  private readonly unitsSvc = inject(UnitsService);
  readonly tenants = inject(TenantsService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  readonly propertyId = signal<string | null>(null);
  readonly unitId = signal<string | null>(null);
  readonly tenantId = signal<string | null>(null);
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly monthlyRent = signal(0);
  readonly deposit = signal(0);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly units = signal<{ id: string; number: string; monthlyRent: number; status: string }[]>([]);
  readonly overlap = signal<Awaited<ReturnType<LeasesService['overlapCheck']>> | null>(null);
  readonly prorated = signal<{ amount: number; daysOccupied: number; daysInMonth: number } | null>(null);

  ngOnInit(): void {
    void this.props.load();
    void this.tenants.load();
  }

  async onPropertyChange(): Promise<void> {
    const pid = this.propertyId();
    if (!pid) return;
    try {
      const units = await this.unitsSvc.loadByProperty(pid);
      this.units.set(units);
      // Preselect the first available unit and its rent.
      const free = units.find((u) => u.status === 'available') ?? units[0];
      if (free) {
        this.unitId.set(free.id);
        this.monthlyRent.set(free.monthlyRent);
        this.deposit.set(free.monthlyRent);
      }
    } catch {
      this.units.set([]);
    }
    this.recheck();
  }

  async recheck(): Promise<void> {
    const unitId = this.unitId();
    const start = this.startDate();
    const end = this.endDate();
    this.overlap.set(null);
    this.prorated.set(null);
    if (!unitId || !start || !end) return;

    try {
      const ov = await this.leases.overlapCheck(unitId, start, end);
      this.overlap.set(ov.overlaps ? ov : null);
    } catch {
      this.overlap.set(null);
    }

    // Client-side proration preview — mirrors the API formula.
    const day = parseInt(start.slice(8, 10), 10);
    if (day > 1) {
      const [y, m] = start.slice(0, 7).split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const daysOccupied = daysInMonth - day + 1;
      const amount = Math.round(((this.monthlyRent() / daysInMonth) * daysOccupied) * 100) / 100;
      this.prorated.set({ amount, daysOccupied, daysInMonth });
    }
  }

  startDay(): number {
    return parseInt(this.startDate().slice(8, 10), 10) || 1;
  }

  async submit(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const lease = await this.leases.create({
        unitId: this.unitId()!,
        tenantId: this.tenantId()!,
        startDate: this.startDate(),
        endDate: this.endDate(),
        monthlyRent: this.monthlyRent(),
        deposit: this.deposit() || this.monthlyRent(),
      });
      this.toasts.show('Lease created — first payment scheduled');
      await this.router.navigate(['/leases', lease.id]);
    } catch (e) {
      const err = e as { error?: { message?: string | string[] } };
      const m = err.error?.message;
      this.error.set(Array.isArray(m) ? m.join('. ') : (m ?? 'Could not create lease'));
    } finally {
      this.saving.set(false);
    }
  }
}
