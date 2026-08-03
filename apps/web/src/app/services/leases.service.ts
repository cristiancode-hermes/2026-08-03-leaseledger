import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Lease } from '../models/models';
import { msg } from './properties.service';

export interface LeaseDetail extends Lease {
  effectiveStatus: string;
  unitNumber?: string;
  propertyName?: string;
  tenantName?: string;
  payments: unknown[];
  maintenance: unknown[];
  proratedFirstMonth?: { amount: number; daysOccupied: number; daysInMonth: number } | null;
}

export interface OverlapResult {
  overlaps: boolean;
  conflicting?: Lease & { tenant?: { name: string } };
}

@Injectable({ providedIn: 'root' })
export class LeasesService {
  private readonly api = '/api/leases';
  readonly state = signal<{ data: Lease[]; loading: boolean; error: string | null }>({
    data: [],
    loading: false,
    error: null,
  });

  constructor(private http: HttpClient) {}

  async load(filters?: { unitId?: string; status?: string; expiringWithinDays?: number }): Promise<Lease[]> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const params: Record<string, string> = {};
      if (filters?.unitId) params['unitId'] = filters.unitId;
      if (filters?.status) params['status'] = filters.status;
      if (filters?.expiringWithinDays) params['expiringWithinDays'] = String(filters.expiringWithinDays);
      const data = await firstValueFrom(
        this.http.get<Lease[]>(this.api, { params }),
      );
      this.state.set({ data, loading: false, error: null });
      return data;
    } catch (e) {
      this.state.set({ data: [], loading: false, error: msg(e) });
      throw e;
    }
  }

  async get(id: string): Promise<LeaseDetail> {
    return firstValueFrom(this.http.get<LeaseDetail>(`${this.api}/${id}`));
  }

  async overlapCheck(unitId: string, start: string, end: string): Promise<OverlapResult> {
    return firstValueFrom(
      this.http.get<OverlapResult>(`${this.api}/overlap-check`, {
        params: { unitId, start, end },
      }),
    );
  }

  async create(body: {
    unitId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    deposit?: number;
  }): Promise<LeaseDetail> {
    return firstValueFrom(this.http.post<LeaseDetail>(this.api, body));
  }

  async renew(id: string, body: { endDate: string; monthlyRent?: number }): Promise<LeaseDetail> {
    return firstValueFrom(this.http.patch<LeaseDetail>(`${this.api}/${id}/renew`, body));
  }

  async terminate(id: string, body: { terminatedAt?: string } = {}): Promise<LeaseDetail> {
    return firstValueFrom(this.http.patch<LeaseDetail>(`${this.api}/${id}/terminate`, body));
  }
}
