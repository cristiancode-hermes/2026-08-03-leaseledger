import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `<div class="modal-backdrop" (click)="close.emit()">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3>{{ title() }}</h3>
        <button class="btn btn-ghost btn-sm" (click)="close.emit()" aria-label="Close">✕</button>
      </div>
      <ng-content></ng-content>
    </div>
  </div>`,
})
export class Modal {
  readonly title = input.required<string>();
  readonly close = output();
}
