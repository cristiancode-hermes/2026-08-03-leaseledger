import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `<div class="card">
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-line" style="width: 90%"></div>
    <div class="skeleton skeleton-line" style="width: 75%"></div>
    <div class="skeleton skeleton-line" style="width: 85%"></div>
    <div class="skeleton skeleton-line" style="width: 40%"></div>
  </div>`,
})
export class Skeleton {
  readonly rows = input(4);
}
