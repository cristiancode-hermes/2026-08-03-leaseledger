import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { MaintenanceRequest } from '../models/models';
import { msg } from './properties.service';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly api = '/api/maintenance';
  readonly state = signal<{ data: MaintenanceRequest[]; loading: boolean; error: string | null }>({
    data: [],
    loading: false,
    error: null,
  });

  constructor(private http: HttpClient) {}

  async load(filters?: { status?: string; priority?: string; unitId?: string }): Promise<MaintenanceRequest[]> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const params: Record<string, string> = {};
      if (filters?.status) params['status'] = filters.status;
      if (filters?.priority) params['priority'] = filters.priority;
      if (filters?.unitId) params['unitId'] = filters.unitId;
      const data = await firstValueFrom(this.http.get<MaintenanceRequest[]>(this.api, { params }));
      this.state.set({ data, loading: false, error: null });
      return data;
    } catch (e) {
      this.state.set({ data: [], loading: false, error: msg(e) });
      throw e;
    }
  }

  async mine(): Promise<MaintenanceRequest[]> {
    return firstValueFrom(this.http.get<MaintenanceRequest[]>(`${this.api}/mine`));
  }

  async create(body: { unitId: string; category: string; priority: string; description: string }): Promise<MaintenanceRequest> {
    return firstValueFrom(this.http.post<MaintenanceRequest>(this.api, body));
  }

  async assign(id: string, assignedTo: string): Promise<MaintenanceRequest> {
    return firstValueFrom(this.http.patch<MaintenanceRequest>(`${this.api}/${id}/assign`, { assignedTo }));
  }

  async start(id: string): Promise<MaintenanceRequest> {
    return firstValueFrom(this.http.patch<MaintenanceRequest>(`${this.api}/${id}/start`, {}));
  }

  async resolve(id: string, cost?: number): Promise<MaintenanceRequest> {
    return firstValueFrom(this.http.patch<MaintenanceRequest>(`${this.api}/${id}/resolve`, { cost }));
  }
}
