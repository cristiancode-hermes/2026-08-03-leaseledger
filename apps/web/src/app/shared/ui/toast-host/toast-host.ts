import { Component, inject } from '@angular/core';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `<div class="toast-host">
    @for (toast of toastList(); track toast.id) {
      <div class="toast" [class]="'toast-' + toast.tone" (click)="dismiss(toast.id)">
        {{ toast.message }}
      </div>
    }
  </div>`,
})
export class ToastHost {
  private readonly service = inject(ToastService);

  toastList() {
    return this.service.toasts();
  }

  dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
