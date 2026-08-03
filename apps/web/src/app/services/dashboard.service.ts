import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { DashboardData, RentPayment } from '../models/models';
import { msg } from './properties.service';

export interface MyLeaseData {
  lease: (Record<string, unknown> & { id: string; startDate: string; endDate: string; monthlyRent: number; deposit: number; effectiveStatus: string; unitNumber?: string; propertyName?: string }) | null;
  payments: RentPayment[];
  nextDue: RentPayment | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = '/api/dashboard';
  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async load(): Promise<DashboardData> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.http.get<DashboardData>(this.api));
      this.data.set(data);
      return data;
    } catch (e) {
      this.error.set(msg(e));
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async myLease(): Promise<MyLeaseData> {
    return firstValueFrom(this.http.get<MyLeaseData>(`${this.api}/my-lease`));
  }
}
