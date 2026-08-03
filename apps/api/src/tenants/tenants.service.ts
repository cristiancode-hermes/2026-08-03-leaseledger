import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Tenant } from '../entities/tenant.entity';
import { Lease } from '../entities/lease.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { AuthUser } from '../auth/auth.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { leaseStatusOn } from '../common/lease-rules';
import { remainingFor } from '../common/payment-rules';
import { todayStr } from '../common/dates';

export interface TenantDetail extends Tenant {
  leases: (Lease & { effectiveStatus: string; unitNumber?: string; propertyName?: string })[];
  paymentSummary: { totalDue: number; totalPaid: number; arrears: number; count: number };
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(RentPayment)
    private readonly payments: Repository<RentPayment>,
  ) {}

  async findAll(q?: string): Promise<Tenant[]> {
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      return this.tenants
        .createQueryBuilder('t')
        .where('t.name LIKE :like', { like })
        .orWhere('t.nif LIKE :like', { like })
        .orWhere('t.email LIKE :like', { like })
        .orderBy('t.name', 'ASC')
        .getMany();
    }
    return this.tenants.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<TenantDetail> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Inquilino no encontrado');

    const leases = await this.leases.find({
      where: { tenantId: id },
      relations: { unit: { property: true } },
      order: { startDate: 'DESC' },
    });
    const today = todayStr();
    const decorated = leases.map((l) => ({
      ...l,
      effectiveStatus: leaseStatusOn(l.status, l.startDate, l.endDate, today),
      unitNumber: l.unit?.number,
      propertyName: l.unit?.property?.name,
    }));

    let totalDue = 0;
    let totalPaid = 0;
    let arrears = 0;
    let count = 0;
    for (const l of leases) {
      const ps = await this.payments.find({ where: { leaseId: l.id } });
      for (const p of ps) {
        totalDue += p.amount;
        totalPaid += p.paidAmount;
        count += 1;
        if (p.status !== 'paid') arrears += remainingFor(p);
      }
    }
    totalDue = Math.round(totalDue * 100) / 100;
    totalPaid = Math.round(totalPaid * 100) / 100;
    arrears = Math.round(arrears * 100) / 100;

    return { ...tenant, leases: decorated, paymentSummary: { totalDue, totalPaid, arrears, count } };
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    await this.assertUnique(dto.email, dto.nif);
    const tenant = this.tenants.create({
      id: randomUUID(),
      name: dto.name.trim(),
      email: dto.email ? dto.email.toLowerCase().trim() : null,
      phone: dto.phone ?? null,
      nif: dto.nif ?? null,
      emergencyContact: dto.emergencyContact ?? null,
    } as any);
    return (await this.tenants.save(tenant)) as unknown as Tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Inquilino no encontrado');
    await this.assertUnique(dto.email ?? undefined, dto.nif ?? undefined, id);

    if (dto.name !== undefined) tenant.name = dto.name.trim();
    if (dto.email !== undefined)
      tenant.email = dto.email ? dto.email.toLowerCase().trim() : null;
    if (dto.phone !== undefined) tenant.phone = dto.phone;
    if (dto.nif !== undefined) tenant.nif = dto.nif;
    if (dto.emergencyContact !== undefined)
      tenant.emergencyContact = dto.emergencyContact;
    return (await this.tenants.save(tenant)) as unknown as Tenant;
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Inquilino no encontrado');
    const active = await this.leases.count({
      where: { tenantId: id, status: 'active' },
    });
    if (active > 0) {
      throw new ConflictException(
        'No se puede eliminar un inquilino con un lease activo.',
      );
    }
    await this.tenants.remove(tenant);
  }

  private async assertUnique(
    email?: string,
    nif?: string,
    excludeId?: string,
  ): Promise<void> {
    if (email) {
      const e = email.toLowerCase().trim();
      const dup = await this.tenants.findOne({ where: { email: e } });
      if (dup && dup.id !== excludeId) {
        throw new ConflictException('Ya existe un inquilino con este email');
      }
    }
    if (nif) {
      const dup = await this.tenants.findOne({ where: { nif } });
      if (dup && dup.id !== excludeId) {
        throw new ConflictException('Ya existe un inquilino con este NIF');
      }
    }
  }
}
