import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `<div class="empty-state">
    <div class="glyph">{{ glyph() }}</div>
    <h3>{{ title() }}</h3>
    <p class="muted">{{ message() }}</p>
    @if (ctaLabel()) {
      <button class="btn btn-primary" (click)="cta.emit()">{{ ctaLabel() }}</button>
    }
  </div>`,
})
export class EmptyState {
  readonly glyph = input('⌂');
  readonly title = input.required<string>();
  readonly message = input('');
  readonly ctaLabel = input('');
  readonly cta = output();
}
