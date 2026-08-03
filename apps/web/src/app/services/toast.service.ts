import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'danger' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, tone: Toast['tone'] = 'success'): void {
    const id = ++this.counter;
    this.toasts.update((t) => [...t, { id, message, tone }]);
    setTimeout(() => this.dismiss(id), 3500);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
