import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Tenant } from '../models/models';
import { msg } from './properties.service';

export interface TenantDetail extends Tenant {
  leases: (Record<string, unknown> & {
    id: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    effectiveStatus: string;
    unitNumber?: string;
    propertyName?: string;
  })[];
  paymentSummary: { totalDue: number; totalPaid: number; arrears: number; count: number };
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private readonly api = '/api/tenants';
  readonly state = signal<{ data: Tenant[]; loading: boolean; error: string | null }>({
    data: [],
    loading: false,
    error: null,
  });

  constructor(private http: HttpClient) {}

  async load(q?: string): Promise<Tenant[]> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = q ? { params: { q } } : {};
      const data = await firstValueFrom(this.http.get<Tenant[]>(this.api, params));
      this.state.set({ data, loading: false, error: null });
      return data;
    } catch (e) {
      this.state.set({ data: [], loading: false, error: msg(e) });
      throw e;
    }
  }

  async get(id: string): Promise<TenantDetail> {
    return firstValueFrom(this.http.get<TenantDetail>(`${this.api}/${id}`));
  }

  async create(body: Partial<Tenant>): Promise<Tenant> {
    const t = await firstValueFrom(this.http.post<Tenant>(this.api, body));
    await this.load();
    return t;
  }

  async update(id: string, body: Partial<Tenant>): Promise<Tenant> {
    const t = await firstValueFrom(this.http.patch<Tenant>(`${this.api}/${id}`, body));
    await this.load();
    return t;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.api}/${id}`));
    await this.load();
  }
}
