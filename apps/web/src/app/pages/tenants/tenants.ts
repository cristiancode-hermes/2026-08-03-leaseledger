import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TenantsService } from '../../services/tenants.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { SearchInput } from '../../shared/ui/search-input/search-input';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [RouterLink, PageHeader, Skeleton, EmptyState, SearchInput],
  template: `
    <app-page-header title="Tenants" subtitle="The people renting your units.">
      <app-search-input (query)="onSearch($event)"></app-search-input>
      <a class="btn btn-primary" routerLink="/tenants/new">＋ Add tenant</a>
    </app-page-header>

    @if (svc.state().loading) {
      <app-skeleton></app-skeleton>
    } @else if (svc.state().error) {
      <div class="alert alert-danger">{{ svc.state().error }}</div>
    } @else if (filtered().length === 0) {
      <app-empty-state glyph="☺" title="No tenants found" message="Add a tenant to link them to a lease." ctaLabel="Add tenant" (cta)="goNew()" />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="ll-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>NIF</th></tr></thead>
            <tbody>
              @for (t of filtered(); track t.id) {
                <tr class="row-link" [routerLink]="['/tenants', t.id]">
                  <td data-label="Name" style="font-weight: 600">{{ t.name }}</td>
                  <td data-label="Email">{{ t.email ?? '—' }}</td>
                  <td data-label="Phone" class="tabular">{{ t.phone ?? '—' }}</td>
                  <td data-label="NIF" class="mono">{{ t.nif ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class TenantsPage implements OnInit {
  readonly svc = inject(TenantsService);
  readonly query = signal('');

  ngOnInit(): void {
    void this.svc.load();
  }

  filtered() {
    const q = this.query().toLowerCase();
    const all = this.svc.state().data;
    if (!q) return all;
    return all.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q) ||
        (t.phone ?? '').includes(q),
    );
  }

  onSearch(q: string): void {
    this.query.set(q);
  }

  goNew(): void {
    window.location.href = '/tenants/new';
  }
}
