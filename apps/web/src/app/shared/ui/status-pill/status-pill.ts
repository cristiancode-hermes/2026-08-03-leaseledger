import { Component, input } from '@angular/core';

export type PillTone = 'success' | 'warning' | 'danger' | 'primary' | 'muted';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  template: `<span class="pill" [class]="'pill-' + tone()">
    <span class="dot"></span>{{ label() }}
  </span>`,
})
export class StatusPill {
  readonly label = input.required<string>();
  readonly tone = input<PillTone>('muted');
}
