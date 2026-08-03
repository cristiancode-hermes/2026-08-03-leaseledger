import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { User, AuthResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = '/api';
  private readonly tokenKey = 'leaseledger_token';

  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = signal(false);
  readonly loading = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    if (this.hasToken()) {
      void this.loadUser();
    }
  }

  hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  async loadUser(): Promise<User | null> {
    if (!this.hasToken()) return null;
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: User }>(`${this.api}/auth/me`),
      );
      this.currentUser.set(res.user);
      this.isLoggedIn.set(true);
      return res.user;
    } catch {
      this.logout();
      return null;
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.api}/auth/login`, { email, password }),
      );
      this.setSession(res);
      await this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }

  async register(name: string, email: string, password: string, role: 'landlord' | 'manager'): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.api}/auth/register`, { name, email, password, role }),
      );
      this.setSession(res);
      await this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    void this.router.navigate(['/login']);
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(this.tokenKey, res.token);
    this.currentUser.set(res.user);
    this.isLoggedIn.set(true);
  }
}
