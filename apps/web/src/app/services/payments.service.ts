import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { RentPayment, RentRoll } from '../models/models';
import { msg } from './properties.service';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly api = '/api/payments';
  readonly roll = signal<RentRoll | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async loadRoll(month: string): Promise<RentRoll> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<RentRoll>(`${this.api}/roll`, { params: { month } }),
      );
      this.roll.set(data);
      return data;
    } catch (e) {
      this.error.set(msg(e));
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async record(body: { leaseId: string; dueDate: string; amount: number; method?: string; paidDate?: string }): Promise<RentPayment> {
    return firstValueFrom(this.http.post<RentPayment>(this.api, body));
  }

  async patch(id: string, body: { paidDate?: string | null; method?: string; paidAmount?: number }): Promise<RentPayment> {
    return firstValueFrom(this.http.patch<RentPayment>(`${this.api}/${id}`, body));
  }

  async arrears(propertyId?: string): Promise<{ total: number; byTenant: { tenantId: string; tenantName: string; arrears: number }[] }> {
    const params = propertyId ? { params: { propertyId } } : {};
    return firstValueFrom(this.http.get<{ total: number; byTenant: { tenantId: string; tenantName: string; arrears: number }[] }>(`${this.api}/arrears`, params));
  }

  /** Export CSV as a Blob download. */
  async downloadCsv(month: string): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.api}/export`, {
        params: { month },
        responseType: 'blob',
      }),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-roll-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
