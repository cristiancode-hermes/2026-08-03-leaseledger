import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertiesService } from '../../services/properties.service';
import { ToastService } from '../../services/toast.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader],
  template: `
    <app-page-header [title]="isEdit() ? 'Edit property' : 'New property'"
      subtitle="Where the building lives in your ledger.">
      <a class="btn btn-secondary" routerLink="/properties">Back</a>
    </app-page-header>

    <div class="card" style="max-width: 560px">
      @if (error()) {
        <div class="alert alert-danger mb-4">{{ error() }}</div>
      }
      <form (ngSubmit)="submit()" #f="ngForm">
        <div class="field">
          <label for="name">Property name</label>
          <input id="name" class="input" [(ngModel)]="form.name" name="name" required placeholder="Casa Robles" />
        </div>
        <div class="field">
          <label for="address">Address</label>
          <input id="address" class="input" [(ngModel)]="form.address" name="address" required placeholder="Av. Robles 45, Madrid" />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" class="select" [(ngModel)]="form.type" name="type">
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="garage">Garage / storage</option>
          </select>
        </div>
        <div class="grid-12">
          <div class="field col-span-6" style="grid-column: span 6">
            <label for="grace">Grace days</label>
            <input id="grace" class="input" type="number" min="0" max="30" [(ngModel)]="form.graceDays" name="graceDays" />
          </div>
          <div class="field col-span-6" style="grid-column: span 6">
            <label for="fee">Late fee rate (%)</label>
            <input id="fee" class="input" type="number" min="0" step="0.5" max="20" [(ngModel)]="form.lateFeeRate" name="lateFeeRate" />
          </div>
        </div>
        <div class="flex justify-between mt-4">
          <a class="btn btn-secondary" routerLink="/properties">Cancel</a>
          <button class="btn btn-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save property' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PropertyFormPage implements OnInit {
  private readonly props = inject(PropertiesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  form = {
    name: '',
    address: '',
    type: 'residential',
    graceDays: 5,
    lateFeeRate: 4,
  };
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private id: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id = id;
      void this.props.get(id).then((p) => {
        this.form = {
          name: p.name,
          address: p.address,
          type: p.type,
          graceDays: p.graceDays,
          lateFeeRate: Math.round(p.lateFeeRate * 100),
        };
      });
    }
  }

  isEdit(): boolean {
    return this.id !== null;
  }

  async submit(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const f = this.form;
      if (this.id) {
        await this.props.update(this.id, {
          name: f.name,
          address: f.address,
          type: f.type as 'residential' | 'commercial' | 'garage',
          graceDays: f.graceDays,
          lateFeeRate: f.lateFeeRate / 100,
        });
        this.toasts.show('Property updated');
      } else {
        const created = await this.props.create({
          name: f.name,
          address: f.address,
          type: f.type,
        });
        this.toasts.show('Property created');
        await this.router.navigate(['/properties', created.id]);
        return;
      }
      await this.router.navigate(['/properties']);
    } catch (e) {
      const err = e as { error?: { message?: string | string[] } };
      const m = err.error?.message;
      this.error.set(Array.isArray(m) ? m.join('. ') : (m ?? 'Could not save property'));
    } finally {
      this.saving.set(false);
    }
  }
}
