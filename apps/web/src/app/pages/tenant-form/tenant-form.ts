import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../services/tenants.service';
import { ToastService } from '../../services/toast.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader],
  template: `
    <app-page-header [title]="isEdit() ? 'Edit tenant' : 'New tenant'"
      subtitle="A tenant profile links one person to all their leases.">
      <a class="btn btn-secondary" routerLink="/tenants">Back</a>
    </app-page-header>

    <div class="card" style="max-width: 560px">
      @if (error()) {
        <div class="alert alert-danger mb-4">{{ error() }}</div>
      }
      <form (ngSubmit)="submit()" #f="ngForm">
        <div class="field">
          <label for="name">Full name</label>
          <input id="name" class="input" [(ngModel)]="form.name" name="name" required placeholder="R. Torres" />
        </div>
        <div class="grid-12">
          <div class="field" style="grid-column: span 6">
            <label for="email">Email</label>
            <input id="email" class="input" type="email" [(ngModel)]="form.email" name="email" placeholder="r.torres@mail.com" />
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="phone">Phone</label>
            <input id="phone" class="input" [(ngModel)]="form.phone" name="phone" placeholder="+34 600 00 00 00" />
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="nif">NIF / ID</label>
            <input id="nif" class="input" [(ngModel)]="form.nif" name="nif" placeholder="12345678A" />
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="em">Emergency contact name</label>
            <input id="em" class="input" [(ngModel)]="form.emName" name="em" placeholder="Contact name" />
          </div>
          <div class="field" style="grid-column: span 6">
            <label for="emphone">Emergency contact phone</label>
            <input id="emphone" class="input" [(ngModel)]="form.emPhone" name="emphone" placeholder="+34 611 11 11 11" />
          </div>
        </div>
        <div class="flex justify-between mt-4">
          <a class="btn btn-secondary" routerLink="/tenants">Cancel</a>
          <button class="btn btn-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save tenant' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class TenantFormPage implements OnInit {
  private readonly svc = inject(TenantsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  form = {
    name: '',
    email: '',
    phone: '',
    nif: '',
    emName: '',
    emPhone: '',
  };
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private id: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id = id;
      void this.svc.get(id).then((t) => {
        this.form = {
          name: t.name,
          email: t.email ?? '',
          phone: t.phone ?? '',
          nif: t.nif ?? '',
          emName: t.emergencyContact?.name ?? '',
          emPhone: t.emergencyContact?.phone ?? '',
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
      const body = {
        name: f.name,
        email: f.email || null,
        phone: f.phone || null,
        nif: f.nif || null,
        emergencyContact:
          f.emName || f.emPhone
            ? { name: f.emName, phone: f.emPhone, relation: 'Familiar' }
            : null,
      };
      if (this.id) {
        await this.svc.update(this.id, body);
        this.toasts.show('Tenant updated');
      } else {
        await this.svc.create(body);
        this.toasts.show('Tenant created');
      }
      await this.router.navigate(['/tenants']);
    } catch (e) {
      const err = e as { error?: { message?: string | string[] } };
      const m = err.error?.message;
      this.error.set(Array.isArray(m) ? m.join('. ') : (m ?? 'Could not save tenant'));
    } finally {
      this.saving.set(false);
    }
  }
}
