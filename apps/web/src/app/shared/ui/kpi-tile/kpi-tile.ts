import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-tile',
  standalone: true,
  template: `<div class="kpi-tile">
    <div class="kpi-label">{{ label() }}</div>
    <div class="kpi-value" [style.color]="color() || undefined">{{ value() }}</div>
    @if (hint()) {
      <div class="kpi-hint">{{ hint() }}</div>
    }
  </div>`,
  imports: [],
})
export class KpiTile {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>('');
  readonly color = input<string>('');
}
