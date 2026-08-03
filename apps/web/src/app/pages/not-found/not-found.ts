import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="empty-state" style="min-height: 70vh; justify-content: center">
      <div class="glyph">?</div>
      <h1>Page not found</h1>
      <p class="muted">The page you are looking for has moved or never existed.</p>
      <a class="btn btn-primary" routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
})
export class NotFoundPage {}
