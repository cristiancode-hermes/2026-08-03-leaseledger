import { Component, input } from '@angular/core';

@Component({
  selector: 'app-money',
  standalone: true,
  template: `<span class="money">{{ formatted() }}</span>`,
})
export class MoneyText {
  readonly amount = input.required<number>();
  readonly currency = input('EUR');

  formatted(): string {
    const a = this.amount() ?? 0;
    return this.currency() === 'EUR' ? `€${a.toFixed(2)}` : `${a.toFixed(2)} ${this.currency()}`;
  }
}
