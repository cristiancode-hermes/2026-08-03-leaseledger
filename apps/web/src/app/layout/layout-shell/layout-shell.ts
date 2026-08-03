import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { ToastHost } from '../../shared/ui/toast-host/toast-host';

const INITIALS = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHost],
  template: `
    <header class="app-header">
      <div class="container app-header-inner">
        <a class="brand" routerLink="/dashboard">
          <span class="brand-glyph">🔑</span> LeaseLedger
        </a>

        @if (isStaff()) {
          <nav class="nav-links" aria-label="Main">
            <a class="nav-link" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Overview</a>
            <a class="nav-link" routerLink="/properties" routerLinkActive="active">Properties</a>
            <a class="nav-link" routerLink="/tenants" routerLinkActive="active">Tenants</a>
            <a class="nav-link" routerLink="/payments" routerLinkActive="active">Rent roll</a>
            <a class="nav-link" routerLink="/maintenance" routerLinkActive="active">Maintenance</a>
          </nav>
        } @else {
          <nav class="nav-links" aria-label="Main">
            <a class="nav-link" routerLink="/my-lease" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">My lease</a>
          </nav>
        }

        <div class="header-actions">
          <button class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
            {{ theme.theme() === 'light' ? '☾' : '☀' }}
          </button>
          <div class="user-chip">
            <span class="avatar">{{ initials() }}</span>
            <span class="user-name">{{ user()?.name }}</span>
            <button class="btn btn-ghost btn-sm" (click)="logout()">Sign out</button>
          </div>
        </div>
      </div>
    </header>

    <main class="container page">
      <router-outlet></router-outlet>
    </main>

    @if (isStaff()) {
      <nav class="nav-bottom" aria-label="Mobile">
        <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><span class="nb-icon">◈</span>Overview</a>
        <a routerLink="/properties" routerLinkActive="active"><span class="nb-icon">⌂</span>Properties</a>
        <a routerLink="/tenants" routerLinkActive="active"><span class="nb-icon">☺</span>Tenants</a>
        <a routerLink="/payments" routerLinkActive="active"><span class="nb-icon">€</span>Rent roll</a>
        <a routerLink="/maintenance" routerLinkActive="active"><span class="nb-icon">⚒</span>Maint.</a>
      </nav>
    } @else {
      <nav class="nav-bottom" aria-label="Mobile">
        <a routerLink="/my-lease" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><span class="nb-icon">⌂</span>My lease</a>
      </nav>
    }

    <app-toast-host></app-toast-host>
  `,
})
export class LayoutShell {
  readonly user = this.auth.currentUser;
  readonly isStaff = computed(() => {
    const u = this.auth.currentUser();
    return u?.role === 'landlord' || u?.role === 'manager';
  });

  constructor(
    private auth: AuthService,
    readonly theme: ThemeService,
    private toasts: ToastService,
  ) {}

  initials(): string {
    return INITIALS(this.auth.currentUser()?.name ?? '?');
  }

  logout(): void {
    this.auth.logout();
    this.toasts.show('Signed out');
  }
}
