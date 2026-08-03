import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { FieldError } from '../../shared/ui/field-error/field-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FieldError, FormsModule],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="brand mb-4"><span class="brand-glyph">🔑</span> LeaseLedger</div>
        <h1>Welcome back</h1>
        <p class="muted mb-5">Sign in to your property desk.</p>

        @if (error()) {
          <div class="alert alert-danger mb-4">{{ error() }}</div>
        }

        <form (ngSubmit)="submit()" #f="ngForm">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
          </div>
          <button class="btn btn-primary" style="width: 100%" [disabled]="auth.loading()">
            {{ auth.loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="small muted mt-4 center">
          New here? <a routerLink="/register">Create an account</a>
        </p>
        <p class="small muted mt-3 center">
          Demo — landlord: <span class="mono">ana@leaseledger.dev</span> / <span class="mono">password123</span><br />
          Tenant: <span class="mono">k.james@mail.com</span> / <span class="mono">password123</span>
        </p>
      </div>
    </div>
  `,
})
export class LoginPage {
  readonly email = signal('ana@leaseledger.dev');
  readonly password = signal('password123');
  readonly error = signal<string | null>(null);

  constructor(readonly auth: AuthService) {}

  async submit(): Promise<void> {
    this.error.set(null);
    try {
      await this.auth.login(this.email(), this.password());
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.error.set(err.error?.message ?? 'Invalid email or password');
    }
  }
}
