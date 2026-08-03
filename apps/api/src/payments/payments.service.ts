import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { RentPayment, PaymentStatus } from '../entities/rent-payment.entity';
import { Lease } from '../entities/lease.entity';
import { Unit } from '../entities/unit.entity';
import { Property } from '../entities/property.entity';
import { Tenant } from '../entities/tenant.entity';
import { AuthUser } from '../auth/auth.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';
import {
  computeLateFee,
  derivePaymentStatus,
  isPastGraceDeadline,
  remainingFor,
} from '../common/payment-rules';
import {
  dueDateForMonth,
  firstDueDate,
  isFirstMonth,
  leaseInMonth,
  monthTotals,
} from '../common/rent-roll';
import { compareDates, parseDate, parseYearMonth, todayStr } from '../common/dates';

export interface RentRollRow {
  leaseId: string;
  unitNumber: string;
  propertyName: string;
  tenantName: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  method: string | null;
  paidAt: string | null;
  lateFee: number | null;
  paymentId: string | null;
}

export interface RentRoll {
  month: string;
  rows: RentRollRow[];
  totals: { due: number; collected: number; arrears: number };
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(RentPayment)
    private readonly payments: Repository<RentPayment>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Property) private readonly props: Repository<Property>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  private async assertLeaseAccess(
    leaseId: string,
    user: AuthUser,
  ): Promise<Lease> {
    const lease = await this.leases.findOne({ where: { id: leaseId } });
    if (!lease) throw new NotFoundException('Lease no encontrado');
    const unit = await this.units.findOne({ where: { id: lease.unitId } });
    const property = unit
      ? await this.props.findOne({ where: { id: unit.propertyId } })
      : null;
    const ownerOk = property?.ownerId === user.id;
    const managerOk =
      user.role === 'manager' && property?.managerId === user.id;
    if (!ownerOk && !managerOk) {
      throw new ForbiddenException('No tienes acceso a este lease');
    }
    return lease;
  }

  /** Apply grace-period logic on-read: unpaid payments past the deadline get their late fee. */
  async refreshLateFees(rows: { lease: Lease; property: Property }[]): Promise<void> {
    const today = todayStr();
    for (const { lease, property } of rows) {
      const existing = await this.payments.find({
        where: { leaseId: lease.id },
      });
      for (const p of existing) {
        if (p.paidAt) continue;
        if (
          p.lateFee === null &&
          isPastGraceDeadline(p.dueDate, property.graceDays, today)
        ) {
          p.lateFee = computeLateFee(p.amount, property.lateFeeRate);
          p.status = 'overdue';
          await this.payments.save(p);
        }
      }
    }
  }

  /** The rent roll for a month: one due row per active lease intersecting the month. */
  async roll(user: AuthUser, month: string): Promise<RentRoll> {
    const { year: _y, month: _m } = parseYearMonth(month);
    const props = await this.props.find({
      where: user.role === 'manager'
        ? [{ managerId: user.id }, { ownerId: user.id }]
        : { ownerId: user.id },
    });
    const propIds = props.map((p) => p.id);
    if (propIds.length === 0) return { month, rows: [], totals: { due: 0, collected: 0, arrears: 0 } };

    const leases = await this.leases
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.unit', 'unit')
      .leftJoinAndSelect('l.tenant', 'tenant')
      .where('unit.propertyId IN (:...propIds)', { propIds })
      .andWhere("l.status IN ('active','draft')")
      .getMany();

    const today = todayStr();
    const rows: RentRollRow[] = [];
    const refreshList: { lease: Lease; property: Property }[] = [];

    for (const lease of leases) {
      const property = props.find((p) => p.id === lease.unit?.propertyId);
      if (!property) continue;
      // Auto-expired on-read → skip from roll.
      if (lease.status === 'active' && compareDates(lease.endDate, today) < 0) continue;
      if (!leaseInMonth(lease.startDate, lease.endDate, month)) continue;

      const start = parseDate(lease.startDate);
      const startDay = start.getUTCDate();
      const dueDate =
        isFirstMonth(lease.startDate, `${month}-01`) ||
        isFirstMonth(lease.startDate, month + '-' + String(startDay).padStart(2, '0'))
          ? firstDueDate(lease.startDate)
          : dueDateForMonth(lease.startDate, startDay, month);

      // First-month row already exists (created with the lease, prorated).
      const existing = await this.payments.findOne({
        where: { leaseId: lease.id, dueDate },
      });
      if (existing) {
        const status = derivePaymentStatus({
          dueDate: existing.dueDate,
          graceDays: property.graceDays,
          today,
          paidAt: existing.paidAt,
          paidAmount: existing.paidAmount,
          amount: existing.amount,
          lateFee: existing.lateFee,
        });
        rows.push({
          leaseId: lease.id,
          unitNumber: lease.unit?.number ?? '',
          propertyName: property.name,
          tenantName: lease.tenant?.name ?? '',
          dueDate: existing.dueDate,
          amount: existing.amount,
          paidAmount: existing.paidAmount,
          status,
          method: existing.method,
          paidAt: existing.paidAt,
          lateFee: existing.lateFee,
          paymentId: existing.id,
        });
        refreshList.push({ lease, property });
        continue;
      }

      // Subsequent months: synthetic due row (persisted lazily on payment).
      const status = derivePaymentStatus({
        dueDate,
        graceDays: property.graceDays,
        today,
        paidAt: null,
        paidAmount: 0,
        amount: lease.monthlyRent,
        lateFee: null,
      });
      rows.push({
        leaseId: lease.id,
        unitNumber: lease.unit?.number ?? '',
        propertyName: property.name,
        tenantName: lease.tenant?.name ?? '',
        dueDate,
        amount: lease.monthlyRent,
        paidAmount: 0,
        status,
        method: null,
        paidAt: null,
        lateFee: null,
        paymentId: null,
      });
    }

    await this.refreshLateFees(refreshList);
    // Re-derive after fee application so the returned rows show 'overdue'.
    for (const row of rows) {
      if (!row.paidAt && row.status !== 'paid' && row.status !== 'partial') {
        const p = this.propsMap.get(row.leaseId) ??
          props.find((x) => x.name === row.propertyName);
        if (p && isPastGraceDeadline(row.dueDate, p.graceDays, today)) {
          row.status = 'overdue';
          row.lateFee = computeLateFee(row.amount, p.lateFeeRate);
        }
      }
    }

    rows.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
    const totals = monthTotals(rows);
    return { month, rows, totals };
  }

  private propsMap = new Map<string, Property>();

  async history(
    user: AuthUser,
    filters: { leaseId?: string; month?: string; status?: string } = {},
  ): Promise<RentPayment[]> {
    if (filters.leaseId) {
      await this.assertLeaseAccess(filters.leaseId, user);
      const qb = this.payments
        .createQueryBuilder('p')
        .where('p.leaseId = :leaseId', { leaseId: filters.leaseId });
      if (filters.month) qb.andWhere("p.dueDate LIKE :month", { month: `${filters.month}%` });
      if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
      return qb.orderBy('p.dueDate', 'DESC').getMany();
    }
    // All payments across the user's properties.
    const props = await this.props.find({
      where: user.role === 'manager'
        ? [{ managerId: user.id }, { ownerId: user.id }]
        : { ownerId: user.id },
    });
    const propIds = props.map((p) => p.id);
    if (propIds.length === 0) return [];
    const qb = this.payments
      .createQueryBuilder('p')
      .innerJoin('p.lease', 'l')
      .innerJoin('l.unit', 'u')
      .where('u.propertyId IN (:...propIds)', { propIds });
    if (filters.month) qb.andWhere("p.dueDate LIKE :month", { month: `${filters.month}%` });
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    return qb.orderBy('p.dueDate', 'DESC').getMany();
  }

  /** Record a payment: upserts the row for (leaseId, dueDate). */
  async record(dto: CreatePaymentDto, user: AuthUser): Promise<RentPayment> {
    await this.assertLeaseAccess(dto.leaseId, user);
    const lease = await this.leases.findOne({
      where: { id: dto.leaseId },
      relations: { unit: { property: true } },
    });
    const property = lease?.unit?.property;
    const graceDays = property?.graceDays ?? 5;
    const today = todayStr();

    let payment = await this.payments.findOne({
      where: { leaseId: dto.leaseId, dueDate: dto.dueDate },
    });
    const paidAt = dto.paidDate ?? today;
    const paidAmount = dto.amount;
    const status: PaymentStatus =
      paidAmount >= dto.amount - 0.005 ? 'paid' : 'partial';

    if (!payment) {
      payment = this.payments.create({
        id: randomUUID(),
        leaseId: dto.leaseId,
        dueDate: dto.dueDate,
        amount: dto.amount,
        paidAmount,
        method: dto.method ?? 'transfer',
        paidAt,
        status,
        lateFee: null,
      } as any) as unknown as RentPayment;
    } else {
      payment.paidAmount = paidAmount;
      payment.method = dto.method ?? payment.method ?? 'transfer';
      payment.paidAt = paidAt;
      payment.status = status;
      payment.lateFee = null; // paid → fee cleared
    }
    return (await this.payments.save(payment)) as unknown as RentPayment;
  }

  /** Corrections: adjust paid date/amount/method of an existing payment. */
  async patch(
    id: string,
    dto: UpdatePaymentDto,
    user: AuthUser,
  ): Promise<RentPayment> {
    const payment = await this.payments.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    await this.assertLeaseAccess(payment.leaseId, user);

    const lease = await this.leases.findOne({
      where: { id: payment.leaseId },
      relations: { unit: { property: true } },
    });
    const graceDays = lease?.unit?.property?.graceDays ?? 5;
    const today = todayStr();

    if (dto.method !== undefined) payment.method = dto.method;
    if (dto.paidDate !== undefined) payment.paidAt = dto.paidDate;
    if (dto.paidAmount !== undefined) payment.paidAmount = dto.paidAmount;

    if (payment.paidAt && payment.paidAmount > 0) {
      payment.status =
        payment.paidAmount >= payment.amount - 0.005 ? 'paid' : 'partial';
      payment.lateFee = null;
    } else {
      payment.status = derivePaymentStatus({
        dueDate: payment.dueDate,
        graceDays,
        today,
        paidAt: payment.paidAt,
        paidAmount: payment.paidAmount,
        amount: payment.amount,
        lateFee: payment.lateFee,
      });
    }
    return (await this.payments.save(payment)) as unknown as RentPayment;
  }

  /** Window-function style arrears per tenant within a property. */
  async arrears(user: AuthUser, propertyId?: string) {
    const props = propertyId
      ? [await this.assertPropertyAccess(propertyId, user)]
      : await this.props.find({
          where: user.role === 'manager'
            ? [{ managerId: user.id }, { ownerId: user.id }]
            : { ownerId: user.id },
        });
    const propIds = props.map((p) => p.id);
    if (propIds.length === 0) return { total: 0, byTenant: [] };

    const payments = await this.payments
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.lease', 'l')
      .innerJoinAndSelect('l.tenant', 't')
      .innerJoin('l.unit', 'u')
      .where('u.propertyId IN (:...propIds)', { propIds })
      .andWhere("p.status IN ('due','late','overdue','partial')")
      .getMany();

    const byTenant = new Map<string, { tenantId: string; tenantName: string; arrears: number }>();
    let total = 0;
    for (const p of payments) {
      const rem = remainingFor(p);
      total = Math.round((total + rem) * 100) / 100;
      const key = p.lease?.tenant?.id ?? 'unknown';
      const entry = byTenant.get(key) ?? {
        tenantId: key,
        tenantName: p.lease?.tenant?.name ?? 'Unknown',
        arrears: 0,
      };
      entry.arrears = Math.round((entry.arrears + rem) * 100) / 100;
      byTenant.set(key, entry);
    }
    const sorted = [...byTenant.values()].sort((a, b) => b.arrears - a.arrears);
    return { total, byTenant: sorted };
  }

  private async assertPropertyAccess(
    propertyId: string,
    user: AuthUser,
  ): Promise<Property> {
    const property = await this.props.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    const ownerOk = property.ownerId === user.id;
    const managerOk =
      user.role === 'manager' && property.managerId === user.id;
    if (!ownerOk && !managerOk) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }
    return property;
  }

  /** CSV export of the rent roll (UTF-8 BOM for Excel). */
  async exportCsv(user: AuthUser, month: string): Promise<string> {
    const roll = await this.roll(user, month);
    const header = 'unit,tenant,dueDate,amount,status,paidDate,method';
    const lines = roll.rows.map((r) =>
      [
        csv(r.unitNumber),
        csv(r.tenantName),
        r.dueDate,
        r.amount.toFixed(2),
        r.status,
        r.paidAt ?? '',
        r.method ?? '',
      ].join(','),
    );
    return '\uFEFF' + [header, ...lines].join('\n');
  }
}

function csv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
