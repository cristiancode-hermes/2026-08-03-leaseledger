import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Unit } from '../models/models';
import { msg } from './properties.service';

export interface UnitDetailData {
  unit: Unit;
  property: { id: string; name: string };
  currentLease: (Record<string, unknown> & { id: string; startDate: string; endDate: string; monthlyRent: number; effectiveStatus: string; tenant?: { name: string } }) | null;
  paymentHistory: unknown[];
  maintenance: unknown[];
}

@Injectable({ providedIn: 'root' })
export class UnitsService {
  private readonly api = '/api/units';
  readonly state = signal<{ data: Unit[]; loading: boolean; error: string | null }>({
    data: [],
    loading: false,
    error: null,
  });

  constructor(private http: HttpClient) {}

  async loadByProperty(propertyId: string): Promise<Unit[]> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await firstValueFrom(
        this.http.get<Unit[]>(`/api/properties/${propertyId}/units`),
      );
      this.state.set({ data, loading: false, error: null });
      return data;
    } catch (e) {
      this.state.set({ data: [], loading: false, error: msg(e) });
      throw e;
    }
  }

  async get(id: string): Promise<UnitDetailData> {
    return firstValueFrom(this.http.get<UnitDetailData>(`${this.api}/${id}`));
  }

  async create(body: Partial<Unit> & { propertyId: string }): Promise<Unit> {
    return firstValueFrom(this.http.post<Unit>(this.api, body));
  }

  async update(id: string, body: Partial<Unit>): Promise<Unit> {
    return firstValueFrom(this.http.patch<Unit>(`${this.api}/${id}`, body));
  }

  async setStatus(id: string, status: Unit['status']): Promise<Unit> {
    return this.update(id, { status });
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.api}/${id}`));
  }
}
