import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PropertiesService } from '../../services/properties.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { SearchInput } from '../../shared/ui/search-input/search-input';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { eur } from '../../shared/format';

import { FormatBase } from '../../shared/format-base';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [RouterLink, PageHeader, Skeleton, EmptyState, SearchInput, StatusPill],
  template: `
    <app-page-header title="Properties" subtitle="Every building in your portfolio.">
      <app-search-input (query)="onSearch($event)"></app-search-input>
      <a class="btn btn-primary" routerLink="/properties/new">＋ Add property</a>
    </app-page-header>

    @if (props.state().loading) {
      <app-skeleton></app-skeleton>
    } @else if (props.state().error) {
      <div class="alert alert-danger">{{ props.state().error }}</div>
    } @else if (filtered().length === 0) {
      <app-empty-state
        glyph="⌂"
        title="No properties found"
        message="Add your first property to start tracking units and leases."
        ctaLabel="Add property"
        (cta)="goNew()"
      />
    } @else {
      <div class="property-grid">
        @for (p of filtered(); track p.id) {
          <div class="property-card" [routerLink]="['/properties', p.id]">
            <div class="flex justify-between items-center">
              <h3>{{ p.name }}</h3>
              <app-status-pill [label]="p.type" [tone]="p.type === 'residential' ? 'primary' : 'muted'" />
            </div>
            <div class="small muted">{{ p.address }}</div>
            <div class="pc-metric">
              <span class="pc-num">{{ p.occupiedCount }}/{{ p.unitCount }}</span>
              <span class="pc-num-label">units occupied</span>
            </div>
            <div class="pc-metric">
              <span class="pc-num">{{ eur(p.monthlyRent) }}</span>
              <span class="pc-num-label">/month when full</span>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class PropertiesPage extends FormatBase implements OnInit {
  readonly props = inject(PropertiesService);
  readonly query = signal('');

  ngOnInit(): void {
    void this.props.load();
  }

  filtered() {
    const q = this.query().toLowerCase();
    const all = this.props.state().data;
    if (!q) return all;
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q),
    );
  }

  onSearch(q: string): void {
    this.query.set(q);
  }

  goNew(): void {
    window.location.href = '/properties/new';
  }
}
