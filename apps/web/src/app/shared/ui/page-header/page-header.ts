import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `<div class="page-header">
    <div>
      <h1>{{ title() }}</h1>
      @if (subtitle()) {
        <p class="subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="flex gap-3 flex-wrap">
      <ng-content></ng-content>
    </div>
  </div>`,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
