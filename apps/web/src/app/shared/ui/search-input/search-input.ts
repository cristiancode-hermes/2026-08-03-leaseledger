import { Component, output } from '@angular/core';

@Component({
  selector: 'app-search-input',
  standalone: true,
  template: `<div class="search-input">
    <span class="search-icon">🔍</span>
    <input
      class="input"
      type="search"
      placeholder="Search…"
      #q
      (input)="onInput(q.value)"
    />
  </div>`,
})
export class SearchInput {
  readonly query = output<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  onInput(value: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.query.emit(value), 300);
  }
}
