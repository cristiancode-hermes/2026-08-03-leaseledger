import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `<div class="modal-backdrop" (click)="cancel.emit()">
    <div class="modal" (click)="$event.stopPropagation()">
      <h3>{{ title() }}</h3>
      <p class="muted mt-2">{{ message() }}</p>
      <div class="flex justify-between mt-5">
        <button class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
        <button class="btn" [class]="danger() ? 'btn-danger' : 'btn-primary'" (click)="confirm.emit()">
          {{ confirmLabel() }}
        </button>
      </div>
    </div>
  </div>`,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly danger = input(false);
  readonly confirm = output();
  readonly cancel = output();
}
