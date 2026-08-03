import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="brand mb-4"><span class="brand-glyph">🔑</span> LeaseLedger</div>
        <h1>Create account</h1>
        <p class="muted mb-5">Set up your property desk.</p>

        @if (error()) {
          <div class="alert alert-danger mb-4">{{ error() }}</div>
        }

        <form (ngSubmit)="submit()" #f="ngForm">
          <div class="field">
            <label for="name">Full name</label>
            <input id="name" class="input" type="text" name="name" [(ngModel)]="name" required />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required minlength="8" />
          </div>
          <div class="field">
            <label>I am a…</label>
            <div class="role-picker">
              <button type="button" class="role-option" [class.selected]="role() === 'landlord'" (click)="role.set('landlord')">🏠 Landlord</button>
              <button type="button" class="role-option" [class.selected]="role() === 'manager'" (click)="role.set('manager')">🗝 Manager</button>
            </div>
          </div>
          <button class="btn btn-primary" style="width: 100%" [disabled]="auth.loading()">
            {{ auth.loading() ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <p class="small muted mt-4 center">
          Already registered? <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterPage {
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly role = signal<'landlord' | 'manager'>('landlord');
  readonly error = signal<string | null>(null);

  constructor(readonly auth: AuthService) {}

  async submit(): Promise<void> {
    this.error.set(null);
    if (!this.name() || !this.email() || this.password().length < 8) {
      this.error.set('Fill in all fields — password needs at least 8 characters');
      return;
    }
    try {
      await this.auth.register(this.name(), this.email(), this.password(), this.role());
    } catch (e) {
      const err = e as { error?: { message?: string | string[] } };
      const m = err.error?.message;
      this.error.set(Array.isArray(m) ? m.join('. ') : (m ?? 'Could not create account'));
    }
  }
}
