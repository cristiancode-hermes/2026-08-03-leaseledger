import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PropertiesService } from '../../services/properties.service';
import { UnitsService } from '../../services/units.service';
import { LeasesService } from '../../services/leases.service';
import { ToastService } from '../../services/toast.service';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { Modal } from '../../shared/ui/modal/modal';
import { FormsModule } from '@angular/forms';
import { eur, unitTone, leaseTone, dateFmt } from '../../shared/format';
import type { Unit } from '../../models/models';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [RouterLink, StatusPill, Skeleton, EmptyState, ConfirmDialog, Modal, FormsModule],
  template: `
    @if (loading()) {
      <app-skeleton></app-skeleton>
    } @else if (p()) {
      <div class="detail-header">
        <div>
          <div class="flex gap-3 items-center">
            <h1>{{ p()!.name }}</h1>
            <app-status-pill [label]="p()!.type" [tone]="'primary'" />
          </div>
          <p class="muted">{{ p()!.address }}</p>
        </div>
        <div class="flex gap-3">
          <a class="btn btn-secondary" [routerLink]="['/properties', p()!.id, 'edit']">Edit</a>
          <a class="btn btn-primary" [routerLink]="['/leases/new']">＋ New lease</a>
          <button class="btn btn-danger btn-sm" (click)="confirmDelete = true">Delete</button>
        </div>
      </div>

      <div class="info-grid mb-5">
        <div class="info-item"><div class="info-label">Grace period</div><div class="info-value">{{ p()!.graceDays }} days</div></div>
        <div class="info-item"><div class="info-label">Late fee</div><div class="info-value">{{ (p()!.lateFeeRate * 100).toFixed(0) }}% / month</div></div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Units</h3>
          <button class="btn btn-secondary btn-sm" (click)="showAddUnit = true">＋ Add unit</button>
        </div>
        @if (units().length === 0) {
          <app-empty-state glyph="▭" title="No units yet" message="Add a unit to start renting it out." ctaLabel="Add unit" (cta)="showAddUnit = true" />
        } @else {
          <div class="table-wrap">
            <table class="ll-table">
              <thead><tr><th>Unit</th><th>Beds / Baths</th><th>Area</th><th>Rent</th><th>Status</th><th>Lease</th></tr></thead>
              <tbody>
                @for (u of units(); track u.id) {
                  <tr class="row-link" [routerLink]="['/units', u.id]">
                    <td data-label="Unit"><span class="mono">{{ u.number }}</span></td>
                    <td data-label="Beds / Baths" class="tabular">{{ u.bedrooms }} / {{ u.bathrooms }}</td>
                    <td data-label="Area" class="num">{{ u.area }} m²</td>
                    <td data-label="Rent" class="num">{{ eur(u.monthlyRent) }}</td>
                    <td data-label="Status"><app-status-pill [label]="u.status" [tone]="unitTone(u.status)" /></td>
                    <td data-label="Lease">{{ leaseFor(u.id) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    @if (showAddUnit) {
      <app-modal title="Add unit" (close)="showAddUnit = false">
        @if (unitError()) {
          <div class="alert alert-danger mb-4">{{ unitError() }}</div>
        }
        <div class="grid-12">
          <div class="field" style="grid-column: span 6">
            <label for="num">Number</label>
            <input id="num" class="input" [(ngModel)]="unitForm.number" name="num" placeholder="A-105" />
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="rent">Monthly rent</label>
            <div class="money-input-wrap">
              <span class="prefix">€</span>
              <input id="rent" class="input" type="number" min="0" [(ngModel)]="unitForm.monthlyRent" name="rent" />
            </div>
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="beds">Bedrooms</label>
            <input id="beds" class="input" type="number" min="0" [(ngModel)]="unitForm.bedrooms" name="beds" />
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="baths">Bathrooms</label>
            <input id="baths" class="input" type="number" min="0" [(ngModel)]="unitForm.bathrooms" name="baths" />
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="area">Area (m²)</label>
            <input id="area" class="input" type="number" min="0" [(ngModel)]="unitForm.area" name="area" />
          </div>
        </div>
        <div class="flex justify-between">
          <button class="btn btn-secondary" (click)="showAddUnit = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="savingUnit()" (click)="addUnit()">
            {{ savingUnit() ? 'Adding…' : 'Add unit' }}
          </button>
        </div>
      </app-modal>
    }

    @if (confirmDelete) {
      <app-confirm-dialog
        title="Delete this property?"
        message="This also removes its units. Leases and payments are kept for the record."
        confirmLabel="Delete"
        [danger]="true"
        (confirm)="deleteProperty()"
        (cancel)="confirmDelete = false"
      />
    }
  `,
})
export class PropertyDetailPage extends FormatBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly props = inject(PropertiesService);
  private readonly unitsSvc = inject(UnitsService);
  private readonly leasesSvc = inject(LeasesService);
  private readonly toasts = inject(ToastService);

  readonly p = signal<{ id: string; name: string; address: string; type: string; graceDays: number; lateFeeRate: number } | null>(null);
  readonly units = signal<Unit[]>([]);
  readonly loading = signal(true);
  readonly leases = signal<{ id: string; unitId: string; status: string; startDate: string; endDate: string; effectiveStatus?: string }[]>([]);

  confirmDelete = false;
  showAddUnit = false;
  unitForm = { number: '', monthlyRent: 0, bedrooms: 1, bathrooms: 1, area: 40 };
  readonly savingUnit = signal(false);
  readonly unitError = signal<string | null>(null);

  private propId = '';

  ngOnInit(): void {
    this.propId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const prop = await this.props.get(this.propId);
      this.p.set(prop);
      const units = await this.unitsSvc.loadByProperty(this.propId);
      this.units.set(units);
      const leases = await this.leasesSvc.load();
      this.leases.set(leases);
    } finally {
      this.loading.set(false);
    }
  }

  leaseFor(unitId: string): string {
    const l = this.leases().find((x) => x.unitId === unitId);
    if (!l) return '—';
    const status = l.effectiveStatus ?? l.status;
    return `${dateFmt(l.startDate)} → ${dateFmt(l.endDate)} (${status})`;
  }

  async addUnit(): Promise<void> {
    this.savingUnit.set(true);
    this.unitError.set(null);
    try {
      const f = this.unitForm;
      await this.unitsSvc.create({ ...f, propertyId: this.propId, status: 'available' });
      this.showAddUnit = false;
      this.toasts.show('Unit added');
      await this.load();
    } catch (e) {
      const err = e as { error?: { message?: string | string[] } };
      const m = err.error?.message;
      this.unitError.set(Array.isArray(m) ? m.join('. ') : (m ?? 'Could not add unit'));
    } finally {
      this.savingUnit.set(false);
    }
  }

  async deleteProperty(): Promise<void> {
    try {
      await this.props.remove(this.propId);
      this.toasts.show('Property deleted');
      await this.router.navigate(['/properties']);
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.toasts.show(err.error?.message ?? 'Could not delete property', 'danger');
      this.confirmDelete = false;
    }
  }
}
