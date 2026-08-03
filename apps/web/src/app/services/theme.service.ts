import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('light');
  private readonly key = 'leaseledger-theme';

  constructor() {
    const stored = localStorage.getItem(this.key) as Theme | null;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initial: Theme = stored ?? (prefersDark ? 'dark' : 'light');
    this.apply(initial);
  }

  toggle(): void {
    this.apply(this.theme() === 'light' ? 'dark' : 'light');
  }

  private apply(t: Theme): void {
    this.theme.set(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(this.key, t);
  }
}
