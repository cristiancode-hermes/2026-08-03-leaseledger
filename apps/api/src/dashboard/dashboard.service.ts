import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities/property.entity';
import { Unit } from '../entities/unit.entity';
import { Lease } from '../entities/lease.entity';
import { Tenant } from '../entities/tenant.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { AuthUser } from '../auth/auth.service';
import { leaseStatusOn } from '../common/lease-rules';
import {
  computeLateFee,
  derivePaymentStatus,
  remainingFor,
} from '../common/payment-rules';
import { addDays, compareDates, todayStr } from '../common/dates';

export interface DashboardData {
  kpis: {
    rentDue: number;
    collected: number;
    overdue: number;
    arrears: number;
    occupancy: number; // 0-100
  };
  expiringLeases: {
    leaseId: string;
    unitNumber: string;
    tenantName: string;
    endDate: string;
    daysLeft: number;
  }[];
  unpaidUnits: {
    leaseId: string;
    unitNumber: string;
    tenantName: string;
    dueDate: string;
    amount: number;
    status: string;
  }[];
  openMaintenance: {
    id: string;
    unitNumber: string;
    description: string;
    priority: string;
    status: string;
  }[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Property) private readonly props: Repository<Property>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(RentPayment)
    private readonly payments: Repository<RentPayment>,
    @InjectRepository(MaintenanceRequest)
    private readonly maintenance: Repository<MaintenanceRequest>,
  ) {}

  async dashboard(user: AuthUser): Promise<DashboardData> {
    const props = await this.props.find({
      where:
        user.role === 'manager'
          ? [{ managerId: user.id }, { ownerId: user.id }]
          : { ownerId: user.id },
    });
    const propIds = props.map((p) => p.id);
    if (propIds.length === 0) {
      return {
        kpis: { rentDue: 0, collected: 0, overdue: 0, arrears: 0, occupancy: 0 },
        expiringLeases: [],
        unpaidUnits: [],
        openMaintenance: [],
      };
    }
    const propMap = new Map(props.map((p) => [p.id, p]));

    const units = await this.units.find({
      where: propIds.map((id) => ({ propertyId: id })),
    });
    const occupied = units.filter((u) => u.status === 'occupied').length;
    const occupancy =
      units.length === 0 ? 0 : Math.round((occupied / units.length) * 100);

    const today = todayStr();
    const month = today.slice(0, 7);

    const leases = await this.leases
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.unit', 'unit')
      .leftJoinAndSelect('l.tenant', 'tenant')
      .where('unit.propertyId IN (:...propIds)', { propIds })
      .andWhere("l.status IN ('active','draft')")
      .getMany();

    // Rent due this month: active leases intersecting the month.
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    let rentDue = 0;
    let collected = 0;
    let overdue = 0;
    let arrears = 0;
    const unpaidUnits: DashboardData['unpaidUnits'] = [];

    for (const lease of leases) {
      const property = propMap.get(lease.unit?.propertyId ?? '');
      if (!property) continue;
      const effective = leaseStatusOn(
        lease.status,
        lease.startDate,
        lease.endDate,
        today,
      );
      if (effective !== 'active') continue;
      if (lease.endDate < monthStart || lease.startDate > monthEnd) continue;

      // Collect all payments of the lease; overdue/arrears across all.
      const leasePayments = await this.payments.find({
        where: { leaseId: lease.id },
      });
      for (const p of leasePayments) {
        const status = derivePaymentStatus({
          dueDate: p.dueDate,
          graceDays: property.graceDays,
          today,
          paidAt: p.paidAt,
          paidAmount: p.paidAmount,
          amount: p.amount,
          lateFee: p.lateFee,
        });
        if (status === 'paid' || status === 'partial') {
          collected = Math.round((collected + p.paidAmount) * 100) / 100;
        }
        if (status === 'late' || status === 'overdue') {
          overdue = Math.round((overdue + remainingFor(p)) * 100) / 100;
        }
        if (status !== 'paid') {
          arrears = Math.round((arrears + remainingFor(p)) * 100) / 100;
        }
      }

      // This month's due row.
      const dueDate = `${month}-${String(
        Math.min(parseInt(lease.startDate.slice(8, 10), 10), 28),
      ).padStart(2, '0')}`;
      const monthPayment = leasePayments.find(
        (p) => p.dueDate === dueDate || p.dueDate.startsWith(month),
      );
      rentDue = Math.round((rentDue + lease.monthlyRent) * 100) / 100;
      const rowStatus = monthPayment
        ? derivePaymentStatus({
            dueDate: monthPayment.dueDate,
            graceDays: property.graceDays,
            today,
            paidAt: monthPayment.paidAt,
            paidAmount: monthPayment.paidAmount,
            amount: monthPayment.amount,
            lateFee: monthPayment.lateFee,
          })
        : 'due';
      if (rowStatus !== 'paid') {
        unpaidUnits.push({
          leaseId: lease.id,
          unitNumber: lease.unit?.number ?? '',
          tenantName: lease.tenant?.name ?? '',
          dueDate,
          amount: lease.monthlyRent,
          status: rowStatus,
        });
      }
    }

    // Expiring leases within 60 days.
    const horizon = addDays(today, 60);
    const expiringLeases: DashboardData['expiringLeases'] = [];
    for (const lease of leases) {
      const effective = leaseStatusOn(
        lease.status,
        lease.startDate,
        lease.endDate,
        today,
      );
      if (effective !== 'active') continue;
      if (compareDates(lease.endDate, horizon) <= 0 && lease.endDate >= today) {
        const daysLeft = daysBetween(today, lease.endDate);
        expiringLeases.push({
          leaseId: lease.id,
          unitNumber: lease.unit?.number ?? '',
          tenantName: lease.tenant?.name ?? '',
          endDate: lease.endDate,
          daysLeft,
        });
      }
    }
    expiringLeases.sort((a, b) => a.daysLeft - b.daysLeft);

    // Open maintenance across the portfolio.
    const openMaintenance = (
      await this.maintenance
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.unit', 'unit')
        .where('m.status != :resolved', { resolved: 'resolved' })
        .andWhere('unit.propertyId IN (:...propIds)', { propIds })
        .orderBy('m.createdAt', 'DESC')
        .limit(6)
        .getMany()
    ).map((m) => ({
      id: m.id,
      unitNumber: m.unit?.number ?? '',
      description: m.description,
      priority: m.priority,
      status: m.status,
    }));

    // Apply late fees lazily for overdue rows so the KPI is consistent.
    for (const lease of leases) {
      const property = propMap.get(lease.unit?.propertyId ?? '');
      if (!property) continue;
      const leasePayments = await this.payments.find({
        where: { leaseId: lease.id },
      });
      for (const p of leasePayments) {
        if (p.paidAt) continue;
        if (p.lateFee === null && compareDates(today, addDays(p.dueDate, property.graceDays)) > 0) {
          p.lateFee = computeLateFee(p.amount, property.lateFeeRate);
          p.status = 'overdue';
          await this.payments.save(p);
        }
      }
    }

    return {
      kpis: {
        rentDue: Math.round(rentDue * 100) / 100,
        collected,
        overdue,
        arrears,
        occupancy,
      },
      expiringLeases,
      unpaidUnits,
      openMaintenance,
    };
  }

  /** Tenant self-service view: lease, payments, next due. */
  async myLease(user: AuthUser) {
    const tenant = await this.tenants.findOne({
      where: { email: user.email.toLowerCase() },
    });
    if (!tenant) {
      throw new NotFoundException(
        'No hay un perfil de inquilino asociado a esta cuenta',
      );
    }
    const today = todayStr();
    const leases = await this.leases.find({
      where: { tenantId: tenant.id },
      relations: { unit: { property: true } },
      order: { startDate: 'DESC' },
    });
    const current =
      leases
        .map((l) => ({
          ...l,
          effectiveStatus: leaseStatusOn(
            l.status,
            l.startDate,
            l.endDate,
            today,
          ),
        }))
        .find(
          (l) =>
            l.effectiveStatus === 'active' ||
            (l.effectiveStatus === 'draft' && l.startDate >= today),
        ) ?? null;

    if (!current) {
      return { lease: null, payments: [], nextDue: null };
    }
    const payments = await this.payments.find({
      where: { leaseId: current.id },
      order: { dueDate: 'DESC' },
    });
    const nextDue =
      payments
        .filter((p) => !p.paidAt && p.dueDate >= today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ??
      payments
        .filter((p) => !p.paidAt)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ??
      null;

    return {
      lease: {
        ...current,
        unitNumber: current.unit?.number,
        propertyName: current.unit?.property?.name,
      },
      payments,
      nextDue,
    };
  }
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + 'T00:00:00Z').getTime();
  const d2 = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((d2 - d1) / 86400000);
}
