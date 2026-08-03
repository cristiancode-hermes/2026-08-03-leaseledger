import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaintenanceService } from '../../services/maintenance.service';
import { PropertiesService } from '../../services/properties.service';
import { UnitsService } from '../../services/units.service';
import { ToastService } from '../../services/toast.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { Modal } from '../../shared/ui/modal/modal';
import { eur, dateFmt, maintTone, priorityTone } from '../../shared/format';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [PageHeader, Skeleton, EmptyState, StatusPill, Modal, FormsModule],
  template: `
    <app-page-header title="Maintenance" subtitle="Open requests across the portfolio.">
      <button class="btn btn-primary" (click)="showNew = true">＋ New request</button>
    </app-page-header>

    <div class="flex gap-3 mb-5 flex-wrap">
      @for (f of ['open', 'assigned', 'in-progress', 'resolved']; track f) {
        <button class="btn" [class]="statusFilter() === f ? 'btn-primary' : 'btn-secondary btn-sm'" (click)="setFilter(f)">
          {{ f }}
        </button>
      }
      <button class="btn btn-secondary btn-sm" (click)="setFilter('')">All</button>
    </div>

    @if (svc.state().loading) {
      <app-skeleton></app-skeleton>
    } @else if (svc.state().error) {
      <div class="alert alert-danger">{{ svc.state().error }}</div>
    } @else if (rows().length === 0) {
      <app-empty-state glyph="⚒" title="Nothing here" message="No requests match this filter." ctaLabel="New request" (cta)="showNew = true" />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="ll-table">
            <thead><tr><th>Unit</th><th>Issue</th><th>Category</th><th>Priority</th><th>Cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (m of rows(); track m.id) {
                <tr>
                  <td data-label="Unit"><span class="mono">{{ m.unit?.number ?? '—' }}</span></td>
                  <td data-label="Issue">{{ m.description }}</td>
                  <td data-label="Category">{{ m.category }}</td>
                  <td data-label="Priority"><app-status-pill [label]="m.priority" [tone]="priorityTone(m.priority)" /></td>
                  <td data-label="Cost" class="num">{{ m.cost ? eur(m.cost) : '—' }}</td>
                  <td data-label="Status"><app-status-pill [label]="m.status" [tone]="maintTone(m.status)" /></td>
                  <td data-label="Actions">
                    <div class="row-actions">
                      @if (m.status === 'open') {
                        <button class="btn btn-secondary btn-sm" (click)="assign(m)">Assign</button>
                      }
                      @if (m.status === 'assigned') {
                        <button class="btn btn-secondary btn-sm" (click)="start(m)">Start</button>
                      }
                      @if (m.status === 'in-progress') {
                        <button class="btn btn-primary btn-sm" (click)="resolvePrompt(m)">Resolve</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    @if (showNew) {
      <app-modal title="New maintenance request" (close)="showNew = false">
        @if (newError()) {
          <div class="alert alert-danger mb-4">{{ newError() }}</div>
        }
        <div class="field">
          <label for="nu">Property</label>
          <select id="nu" class="select" [(ngModel)]="newProperty" name="nu" (ngModelChange)="onPropertyChange()">
            <option [ngValue]="null" disabled>Select property…</option>
            @for (p of props.state().data; track p.id) {
              <option [ngValue]="p.id">{{ p.name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="nunit">Unit</label>
          <select id="nunit" class="select" [(ngModel)]="newUnitId" name="nunit">
            <option [ngValue]="null" disabled>Select unit…</option>
            @for (u of units(); track u.id) {
              <option [ngValue]="u.id">{{ u.number }}</option>
            }
          </select>
        </div>
        <div class="grid-12">
          <div class="field" style="grid-column: span 6">
            <label for="ncat">Category</label>
            <select id="ncat" class="select" [(ngModel)]="newCategory" name="ncat">
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="heating">Heating</option>
              <option value="appliance">Appliance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="nprio">Priority</label>
            <select id="nprio" class="select" [(ngModel)]="newPriority" name="nprio">
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="ndesc">Description</label>
          <textarea id="ndesc" class="textarea" [(ngModel)]="newDescription" name="ndesc" placeholder="What needs fixing?"></textarea>
        </div>
        <div class="flex justify-between">
          <button class="btn btn-secondary" (click)="showNew = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="savingNew()" (click)="createRequest()">
            {{ savingNew() ? 'Creating…' : 'Create request' }}
          </button>
        </div>
      </app-modal>
    }

    @if (resolveTarget()) {
      <app-modal title="Resolve request" (close)="resolveTarget.set(null)">
        <div class="field">
          <label for="cost">Cost (€)</label>
          <input id="cost" class="input" type="number" min="0" [(ngModel)]="resolveCost" name="cost" />
        </div>
        <div class="flex justify-between">
          <button class="btn btn-secondary" (click)="resolveTarget.set(null)">Cancel</button>
          <button class="btn btn-primary" (click)="resolve()">Mark resolved</button>
        </div>
      </app-modal>
    }
  `,
})
export class MaintenancePage extends FormatBase implements OnInit {
  readonly svc = inject(MaintenanceService);
  readonly props = inject(PropertiesService);
  private readonly unitsSvc = inject(UnitsService);
  private readonly toasts = inject(ToastService);

  readonly statusFilter = signal('');
  readonly units = signal<{ id: string; number: string }[]>([]);
  readonly all = signal<Awaited<ReturnType<MaintenanceService['load']>>>([]);

  showNew = false;
  readonly newProperty = signal<string | null>(null);
  readonly newUnitId = signal<string | null>(null);
  readonly newCategory = signal('plumbing');
  readonly newPriority = signal('med');
  readonly newDescription = signal('');
  readonly newError = signal<string | null>(null);
  readonly savingNew = signal(false);

  readonly resolveTarget = signal<{ id: string } | null>(null);
  readonly resolveCost = signal(0);

  ngOnInit(): void {
    void this.props.load();
    void this.loadAll();
  }

  async loadAll(): Promise<void> {
    const data = await this.svc.load();
    this.all.set(data);
  }

  rows() {
    const f = this.statusFilter();
    const all = this.all();
    if (!f) return all;
    return all.filter((m) => m.status === f);
  }

  setFilter(f: string): void {
    this.statusFilter.set(f);
  }

  async onPropertyChange(): Promise<void> {
    const pid = this.newProperty();
    if (!pid) return;
    const units = await this.unitsSvc.loadByProperty(pid);
    this.units.set(units);
  }

  async createRequest(): Promise<void> {
    this.savingNew.set(true);
    this.newError.set(null);
    try {
      await this.svc.create({
        unitId: this.newUnitId()!,
        category: this.newCategory(),
        priority: this.newPriority(),
        description: this.newDescription() || 'Maintenance request',
      });
      this.showNew = false;
      this.toasts.show('Request created');
      await this.loadAll();
    } catch (e) {
      const err = e as { error?: { message?: string | string[] } };
      const m = err.error?.message;
      this.newError.set(Array.isArray(m) ? m.join('. ') : (m ?? 'Could not create request'));
    } finally {
      this.savingNew.set(false);
    }
  }

  async assign(m: { id: string }): Promise<void> {
    try {
      await this.svc.assign(m.id, 'user-manager1');
      this.toasts.show('Assigned');
      await this.loadAll();
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.toasts.show(err.error?.message ?? 'Could not assign', 'danger');
    }
  }

  async start(m: { id: string }): Promise<void> {
    try {
      await this.svc.start(m.id);
      this.toasts.show('Work started');
      await this.loadAll();
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.toasts.show(err.error?.message ?? 'Could not start', 'danger');
    }
  }

  resolvePrompt(m: { id: string }): void {
    this.resolveTarget.set(m);
    this.resolveCost.set(0);
  }

  async resolve(): Promise<void> {
    const target = this.resolveTarget();
    if (!target) return;
    try {
      await this.svc.resolve(target.id, this.resolveCost() || undefined);
      this.resolveTarget.set(null);
      this.toasts.show('Request resolved');
      await this.loadAll();
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.toasts.show(err.error?.message ?? 'Could not resolve', 'danger');
    }
  }
}
