import { Component, output } from '@angular/core';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Component({
  selector: 'app-month-picker',
  standalone: true,
  template: `<div class="month-nav">
    <button class="btn btn-ghost btn-sm" (click)="shift(-1)" aria-label="Previous month">‹</button>
    <span class="month-label">{{ label() }}</span>
    <button class="btn btn-ghost btn-sm" (click)="shift(1)" aria-label="Next month">›</button>
  </div>`,
})
export class MonthPicker {
  readonly monthChange = output<string>();
  month = '';

  current(): string {
    if (!this.month) {
      const now = new Date();
      this.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.month;
  }

  label(): string {
    const [y, m] = this.current().split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }

  shift(delta: number): void {
    const [y, m] = this.current().split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.monthChange.emit(this.month);
  }

  set(month: string): void {
    this.month = month;
  }
}
