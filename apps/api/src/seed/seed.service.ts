import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Property } from '../entities/property.entity';
import { Unit } from '../entities/unit.entity';
import { Tenant } from '../entities/tenant.entity';
import { Lease } from '../entities/lease.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { prorateRent } from '../common/proration';
import { todayStr } from '../common/dates';

/**
 * Deterministic seed — stable named UUIDs, fixtures from DATABASE_SCHEMA.md:
 * 2 landlords, 1 manager, 1 tenant user, 2 properties (4 + 3 units),
 * 6 tenants, 6 leases (active/expiring/expired + maintenance unit),
 * 30+ payments (paid/late/overdue incl. an arrears case), 4 maintenance requests.
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Property) private readonly props: Repository<Property>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(RentPayment)
    private readonly payments: Repository<RentPayment>,
    @InjectRepository(MaintenanceRequest)
    private readonly maintenance: Repository<MaintenanceRequest>,
  ) {}

  async seed() {
    if ((await this.users.count()) > 0) return;
    this.logger.log('Seeding LeaseLedger demo data…');

    const hash = await bcrypt.hash('password123', 10);
    const users: Record<string, User> = {};
    for (const [id, name, email, role] of [
      ['user-landlord1', 'Ana Torres', 'ana@leaseledger.dev', 'landlord'],
      ['user-landlord2', 'Carlos Ruiz', 'carlos@leaseledger.dev', 'landlord'],
      ['user-manager1', 'Marta Díaz', 'marta@leaseledger.dev', 'manager'],
      ['user-tenant1', 'Kevin James', 'k.james@mail.com', 'tenant'],
    ] as const) {
      users[id] = (await this.users.save(
        this.users.create({
          id,
          email,
          name,
          passwordHash: hash,
          role,
        } as any) as unknown as User,
      )) as unknown as User;
    }

    const props: Record<string, Property> = {};
    props['prop-robles'] = (await this.props.save(
      this.props.create({
        id: 'prop-robles',
        ownerId: 'user-landlord1',
        managerId: null,
        name: 'Casa Robles',
        address: 'Av. Robles 45, Madrid',
        type: 'residential',
        graceDays: 5,
        lateFeeRate: 0.04,
      } as any) as unknown as Property,
    )) as unknown as Property;
    props['prop-sol12'] = (await this.props.save(
      this.props.create({
        id: 'prop-sol12',
        ownerId: 'user-landlord1',
        managerId: 'user-manager1',
        name: 'Calle Sol 12',
        address: 'Calle Sol 12, Madrid',
        type: 'residential',
        graceDays: 7,
        lateFeeRate: 0.05,
      } as any) as unknown as Property,
    )) as unknown as Property;

    const unitDefs: [string, string, string, number, number, number, number, string][] = [
      ['unit-a101', 'prop-robles', 'A-101', 2, 1, 62, 800, 'occupied'],
      ['unit-a102', 'prop-robles', 'A-102', 2, 1, 65, 850, 'occupied'],
      ['unit-a103', 'prop-robles', 'A-103', 1, 1, 45, 550, 'maintenance'],
      ['unit-a104', 'prop-robles', 'A-104', 1, 1, 48, 580, 'available'],
      ['unit-b201', 'prop-sol12', 'B-201', 3, 2, 78, 700, 'occupied'],
      ['unit-b202', 'prop-sol12', 'B-202', 2, 1, 60, 750, 'occupied'],
      ['unit-b203', 'prop-sol12', 'B-203', 1, 1, 42, 600, 'available'],
    ];
    const unitIds: Record<string, Unit> = {};
    for (const [id, pid, number, beds, baths, area, rent, status] of unitDefs) {
      unitIds[id] = (await this.units.save(
        this.units.create({
          id,
          propertyId: pid,
          number,
          bedrooms: beds,
          bathrooms: baths,
          area,
          monthlyRent: rent,
          status,
        } as any) as unknown as Unit,
      )) as unknown as Unit;
    }

    const tenantDefs: [string, string, string, string, string][] = [
      ['ten-torres', 'R. Torres', 'r.torres@mail.com', '+34 600 00 00 00', '12345678A'],
      ['ten-garcia', 'M. García', 'm.garcia@mail.com', '+34 600 00 00 01', '23456789B'],
      ['ten-rico', 'P. Rico', 'p.rico@mail.com', '+34 600 00 00 02', '34567890C'],
      ['ten-soto', 'L. Soto', 'l.soto@mail.com', '+34 600 00 00 03', '45678901D'],
      ['ten-james', 'K. James', 'k.james@mail.com', '+34 600 00 00 04', '56789012E'],
      ['ten-moreno', 'N. Moreno', 'n.moreno@mail.com', '+34 600 00 00 05', '67890123F'],
    ];
    const tenantIds: Record<string, Tenant> = {};
    for (const [id, name, email, phone, nif] of tenantDefs) {
      tenantIds[id] = (await this.tenants.save(
        this.tenants.create({
          id,
          name,
          email,
          phone,
          nif,
          emergencyContact: { name: 'Contacto', phone: '+34 611 11 11 11', relation: 'Familiar' },
        } as any) as unknown as Tenant,
      )) as unknown as Tenant;
    }

    const leaseDefs: [string, string, string, string, string, number][] = [
      ['lease-a101', 'unit-a101', 'ten-torres', '2026-03-01', '2026-12-31', 800],
      ['lease-a102', 'unit-a102', 'ten-garcia', '2026-01-01', '2026-12-31', 850],
      ['lease-a103', 'unit-a103', 'ten-rico', '2026-02-01', '2027-01-31', 550],
      ['lease-b201', 'unit-b201', 'ten-soto', '2026-02-01', '2026-09-15', 700],
      ['lease-b202', 'unit-b202', 'ten-james', '2026-01-15', '2026-12-31', 750],
      ['lease-b203', 'unit-b203', 'ten-moreno', '2026-06-01', '2026-07-31', 600],
    ];
    const leaseIds: Record<string, Lease> = {};
    for (const [id, unitId, tenantId, start, end, rent] of leaseDefs) {
      const status = id === 'lease-b203' ? 'expired' : 'active';
      leaseIds[id] = (await this.leases.save(
        this.leases.create({
          id,
          unitId,
          tenantId,
          startDate: start,
          endDate: end,
          monthlyRent: rent,
          deposit: rent,
          status,
          terminatedAt: null,
          terms: { includes: ['water', 'community'], pets: false, notes: '' },
        } as any) as unknown as Lease,
      )) as unknown as Lease;
    }

    // Payments: every month from lease start → July 2026 (Aug is the live month).
    const paymentDefs: [string, string, string, number, number, string, string | null][] = [];
    const addPaid = (
      leaseId: string,
      dueDate: string,
      amount: number,
      method: string,
      paidDate: string,
    ) =>
      paymentDefs.push([
        `pay-${leaseId}-${dueDate}`,
        leaseId,
        dueDate,
        amount,
        amount,
        method,
        paidDate,
      ]);
    const addUnpaid = (leaseId: string, dueDate: string, amount: number) =>
      paymentDefs.push([`pay-${leaseId}-${dueDate}`, leaseId, dueDate, amount, 0, 'transfer', null]);

    const monthList = (start: string, end: string): string[] => {
      const out: string[] = [];
      let [y, m] = start.slice(0, 7).split('-').map(Number);
      const [ey, em] = end.slice(0, 7).split('-').map(Number);
      while (y < ey || (y === ey && m <= em)) {
        out.push(`${y}-${String(m).padStart(2, '0')}`);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
      return out;
    };

    for (const [lid, , , start, end, rent] of leaseDefs) {
      const months = monthList(start, end).filter((ym) => ym <= todayStr().slice(0, 7));
      for (const ym of months) {
        const [, , day] = start.split('-').map(Number);
        const dayStr = String(day).padStart(2, '0');
        const dueDate = `${ym}-${dayStr}`;
        const [y, m] = ym.split('-').map(Number);
        const prorated =
          ym === start.slice(0, 7) && day > 1
            ? prorateRent(rent, y, m, day).amount
            : rent;

        if (lid === 'lease-b202') {
          // Arrears fixture: Jan–May paid, Jun + Jul unpaid (overdue).
          if (ym <= '2026-05') addPaid(lid, dueDate, prorated, 'transfer', dueDate);
          else addUnpaid(lid, dueDate, prorated);
        } else {
          addPaid(lid, dueDate, prorated, 'transfer', dueDate);
        }
      }
    }

    for (const [id, leaseId, dueDate, amount, paidAmount, method, paidAt] of paymentDefs) {
      const today = todayStr();
      const isPastDue = dueDate < today;
      const status = paidAt
        ? paidAmount >= amount - 0.005
          ? 'paid'
          : 'partial'
        : isPastDue
          ? 'overdue'
          : 'due';
      // Late fee only once the due date has actually passed.
      const lateFee =
        !paidAt && isPastDue && leaseId === 'lease-b202'
          ? Math.round(amount * 0.05 * 100) / 100
          : null;
      await this.payments.save(
        this.payments.create({
          id,
          leaseId,
          dueDate,
          amount,
          paidAmount,
          method: paidAt ? method : null,
          paidAt,
          status,
          lateFee,
        } as any) as unknown as RentPayment,
      );
    }

    // Maintenance requests (4 across statuses).
    const maintDefs: [string, string, string, string, string, string, number | null, string | null][] = [
      ['maint-1', 'unit-b202', 'plumbing', 'high', 'Fuga de agua bajo el fregadero de la cocina', 'open', null, null],
      ['maint-2', 'unit-a103', 'heating', 'med', 'Ruido fuerte en el calentador al encender', 'in-progress', 120, null],
      ['maint-3', 'unit-b201', 'other', 'low', 'Bisagra de la puerta del balcón suelta', 'resolved', 45, '2026-07-28'],
      ['maint-4', 'unit-a101', 'electrical', 'med', 'Enchufe de la cocina sin corriente', 'assigned', null, null],
    ];
    for (const [id, unitId, category, priority, desc, status, cost, resolvedAt] of maintDefs) {
      await this.maintenance.save(
        this.maintenance.create({
          id,
          unitId,
          leaseId: unitId.startsWith('unit-a') ? `lease-${unitId.slice(5)}` : `lease-${unitId.slice(5)}`,
          reportedById: 'user-landlord1',
          assignedTo: status === 'assigned' || status === 'in-progress' ? 'user-manager1' : null,
          category,
          priority,
          description: desc,
          status,
          cost,
          resolvedAt,
        } as any) as unknown as MaintenanceRequest,
      );
    }

    this.logger.log(
      `Seeded: ${Object.keys(users).length} users, ${Object.keys(props).length} properties, ${Object.keys(unitIds).length} units, ${Object.keys(tenantIds).length} tenants, ${Object.keys(leaseIds).length} leases, ${paymentDefs.length} payments, ${maintDefs.length} maintenance requests`,
    );
  }
}
