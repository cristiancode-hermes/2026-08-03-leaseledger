import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Property, PropertySummary } from '../models/models';

export interface PropertiesState {
  data: PropertySummary[];
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class PropertiesService {
  private readonly api = '/api/properties';
  readonly state = signal<PropertiesState>({ data: [], loading: false, error: null });

  constructor(private http: HttpClient) {}

  async load(q?: string): Promise<PropertySummary[]> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = q ? { params: { q } } : {};
      const data = await firstValueFrom(
        this.http.get<PropertySummary[]>(this.api, params),
      );
      this.state.set({ data, loading: false, error: null });
      return data;
    } catch (e) {
      this.state.set({ data: [], loading: false, error: msg(e) });
      throw e;
    }
  }

  async get(id: string): Promise<Property> {
    return firstValueFrom(this.http.get<Property>(`${this.api}/${id}`));
  }

  async create(body: { name: string; address: string; type: string }): Promise<Property> {
    const p = await firstValueFrom(this.http.post<Property>(this.api, body));
    await this.load();
    return p;
  }

  async update(id: string, body: Partial<Property>): Promise<Property> {
    const p = await firstValueFrom(this.http.patch<Property>(`${this.api}/${id}`, body));
    await this.load();
    return p;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.api}/${id}`));
    await this.load();
  }
}

export function msg(e: unknown): string {
  const err = e as { error?: { message?: string | string[] } };
  const m = err?.error?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? 'Something went wrong';
}
