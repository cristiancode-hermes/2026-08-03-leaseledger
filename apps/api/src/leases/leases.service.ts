import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Lease } from '../entities/lease.entity';
import { Unit } from '../entities/unit.entity';
import { Tenant } from '../entities/tenant.entity';
import { Property } from '../entities/property.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { AuthUser } from '../auth/auth.service';
import {
  CreateLeaseDto,
  RenewLeaseDto,
  TerminateLeaseDto,
} from './dto/lease.dto';
import {
  canRenew,
  canTerminate,
  leaseStatusOn,
  rangesOverlap,
} from '../common/lease-rules';
import { prorateRent } from '../common/proration';
import { compareDates, parseDate, todayStr } from '../common/dates';

export interface LeaseDetail extends Lease {
  effectiveStatus: string;
  unitNumber?: string;
  propertyName?: string;
  tenantName?: string;
  payments: RentPayment[];
  maintenance: MaintenanceRequest[];
  proratedFirstMonth?: { amount: number; daysOccupied: number; daysInMonth: number } | null;
}

@Injectable()
export class LeasesService {
  constructor(
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Property) private readonly props: Repository<Property>,
    @InjectRepository(RentPayment)
    private readonly payments: Repository<RentPayment>,
    @InjectRepository(MaintenanceRequest)
    private readonly maintenance: Repository<MaintenanceRequest>,
  ) {}

  /** Ownership/assignment gate: the unit's property must be owned/assigned to the user. */
  private async assertUnitAccess(
    unitId: string,
    user: AuthUser,
  ): Promise<{ unit: Unit; property: Property }> {
    const unit = await this.units.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    const property = await this.props.findOne({
      where: { id: unit.propertyId },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    const ownerOk = property.ownerId === user.id;
    const managerOk =
      user.role === 'manager' && property.managerId === user.id;
    if (!ownerOk && !managerOk) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }
    return { unit, property };
  }

  private async assertLeaseAccess(
    leaseId: string,
    user: AuthUser,
  ): Promise<Lease> {
    const lease = await this.leases.findOne({ where: { id: leaseId } });
    if (!lease) throw new NotFoundException('Lease no encontrado');
    await this.assertUnitAccess(lease.unitId, user);
    return lease;
  }

  async findAll(
    user: AuthUser,
    opts: { unitId?: string; status?: string; expiringWithinDays?: number } = {},
  ): Promise<Lease[]> {
    const qb = this.leases
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.unit', 'unit')
      .leftJoinAndSelect('l.tenant', 'tenant')
      .innerJoin('unit.property', 'property')
      .where('(property.ownerId = :uid OR property.managerId = :uid)', {
        uid: user.id,
      })
      .orderBy('l.startDate', 'DESC');
    if (opts.unitId) qb.andWhere('l.unitId = :unitId', { unitId: opts.unitId });
    if (opts.status) qb.andWhere('l.status = :status', { status: opts.status });
    if (opts.expiringWithinDays) {
      const horizon = addDaysStr(todayStr(), opts.expiringWithinDays);
      qb.andWhere("l.status = 'active'")
        .andWhere('l.endDate <= :horizon', { horizon })
        .andWhere('l.endDate >= :today', { today: todayStr() });
    }
    const leases = await qb.getMany();
    const today = todayStr();
    return leases.map((l) => ({
      ...l,
      status: leaseStatusOn(l.status, l.startDate, l.endDate, today) as Lease['status'],
    }));
  }

  async findOne(id: string, user: AuthUser): Promise<LeaseDetail> {
    const lease = await this.leases.findOne({
      where: { id },
      relations: { unit: { property: true }, tenant: true },
    });
    if (!lease) throw new NotFoundException('Lease no encontrado');
    await this.assertUnitAccess(lease.unitId, user);

    const today = todayStr();
    const effectiveStatus = leaseStatusOn(
      lease.status,
      lease.startDate,
      lease.endDate,
      today,
    );
    const payments = await this.payments.find({
      where: { leaseId: id },
      order: { dueDate: 'DESC' },
    });
    const maintenance = await this.maintenance.find({
      where: { leaseId: id },
      order: { createdAt: 'DESC' },
    });
    const d = parseDate(lease.startDate);
    const prorated =
      d.getUTCDate() !== 1
        ? prorateRent(
            lease.monthlyRent,
            d.getUTCFullYear(),
            d.getUTCMonth() + 1,
            d.getUTCDate(),
          )
        : null;

    return {
      ...lease,
      effectiveStatus,
      unitNumber: lease.unit?.number,
      propertyName: lease.unit?.property?.name,
      tenantName: lease.tenant?.name,
      payments,
      maintenance,
      proratedFirstMonth: prorated,
    };
  }

  async overlapCheck(unitId: string, start: string, end: string) {
    const conflicting = await this.findOverlapping(unitId, start, end);
    return { overlaps: !!conflicting, conflicting: conflicting ?? undefined };
  }

  private async findOverlapping(
    unitId: string,
    start: string,
    end: string,
  ): Promise<Lease | null> {
    const leases = await this.leases.find({
      where: { unitId },
      relations: { tenant: true },
    });
    for (const l of leases) {
      if (l.status !== 'draft' && l.status !== 'active') continue;
      if (rangesOverlap(start, end, l.startDate, l.endDate)) return l;
    }
    return null;
  }

  async create(dto: CreateLeaseDto, user: AuthUser): Promise<LeaseDetail> {
    if (compareDates(dto.startDate, dto.endDate) >= 0) {
      throw new BadRequestException('endDate debe ser posterior a startDate');
    }
    await this.assertUnitAccess(dto.unitId, user);
    const tenant = await this.tenants.findOne({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException('Inquilino no encontrado');

    const conflicting = await this.findOverlapping(
      dto.unitId,
      dto.startDate,
      dto.endDate,
    );
    if (conflicting) {
      throw new ConflictException(
        `La unidad ya tiene un lease ${conflicting.status} del ${conflicting.startDate} al ${conflicting.endDate}. Elige otra unidad o ajusta las fechas.`,
      );
    }

    const today = todayStr();
    const status =
      compareDates(dto.startDate, today) <= 0 ? 'active' : 'draft';

    const lease = this.leases.create({
      id: randomUUID(),
      unitId: dto.unitId,
      tenantId: dto.tenantId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      monthlyRent: dto.monthlyRent,
      deposit: dto.deposit ?? 0,
      status,
      terms: { includes: ['water', 'community'], pets: false, notes: '' },
    } as any);
    const saved = (await this.leases.save(lease)) as unknown as Lease;

    // First rent payment: prorated when move-in isn't the 1st of the month.
    const d = parseDate(dto.startDate);
    const prorated = prorateRent(
      dto.monthlyRent,
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
    );
    await this.payments.save(
      this.payments.create({
        id: randomUUID(),
        leaseId: saved.id,
        dueDate: dto.startDate,
        amount: prorated.amount,
        paidAmount: 0,
        method: null,
        paidAt: null,
        status: 'due',
        lateFee: null,
      } as any),
    );

    // Unit coupling: occupied once the lease is active.
    if (status === 'active') {
      await this.units.update(dto.unitId, { status: 'occupied' });
    }

    return this.findOne(saved.id, user);
  }

  async renew(
    id: string,
    dto: RenewLeaseDto,
    user: AuthUser,
  ): Promise<LeaseDetail> {
    const lease = await this.assertLeaseAccess(id, user);
    const today = todayStr();
    const effective = leaseStatusOn(
      lease.status,
      lease.startDate,
      lease.endDate,
      today,
    );
    if (!canRenew(effective)) {
      throw new BadRequestException(
        'Solo se puede renovar un lease activo',
      );
    }
    if (compareDates(dto.endDate, lease.endDate) <= 0) {
      throw new BadRequestException(
        'El nuevo endDate debe ser posterior al actual',
      );
    }
    lease.endDate = dto.endDate;
    if (dto.monthlyRent !== undefined) lease.monthlyRent = dto.monthlyRent;
    await this.leases.save(lease);
    return this.findOne(id, user);
  }

  async terminate(
    id: string,
    dto: TerminateLeaseDto,
    user: AuthUser,
  ): Promise<LeaseDetail> {
    const lease = await this.assertLeaseAccess(id, user);
    const today = todayStr();
    const effective = leaseStatusOn(
      lease.status,
      lease.startDate,
      lease.endDate,
      today,
    );
    if (!canTerminate(effective)) {
      throw new BadRequestException(
        'No se puede terminar un lease ya terminado o expirado',
      );
    }
    lease.status = 'terminated';
    lease.terminatedAt = dto.terminatedAt ?? today;
    await this.leases.save(lease);
    // Unit freed.
    await this.units.update(lease.unitId, { status: 'available' });
    return this.findOne(id, user);
  }
}

function addDaysStr(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
