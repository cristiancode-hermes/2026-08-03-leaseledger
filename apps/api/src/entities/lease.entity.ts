import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Unit } from './unit.entity';
import { Tenant } from './tenant.entity';
import { RentPayment } from './rent-payment.entity';
import { MaintenanceRequest } from './maintenance-request.entity';
import { moneyTransformer } from '../common/money';
import { JSON_COL } from '../common/column-types';

export type LeaseStatus = 'draft' | 'active' | 'expired' | 'terminated';

export interface LeaseTerms {
  includes?: string[];
  pets?: boolean;
  notes?: string;
}

@Entity('leases')
@Index(['unitId', 'status'])
export class Lease {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  unitId: string;

  @ManyToOne(() => Unit, (u) => u.leases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Index()
  @Column('text')
  tenantId: string;

  @ManyToOne(() => Tenant, (t) => t.leases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  /** Inclusive start date (YYYY-MM-DD). */
  @Index()
  @Column({ type: 'date' })
  startDate: string;

  /** Inclusive end date (YYYY-MM-DD). */
  @Index()
  @Column({ type: 'date' })
  endDate: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  monthlyRent: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  deposit: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: LeaseStatus;

  @Column({ type: 'date', nullable: true })
  terminatedAt: string | null;

  @Column({ type: JSON_COL, nullable: true })
  terms: LeaseTerms | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => RentPayment, (p) => p.lease)
  payments: RentPayment[];

  @OneToMany(() => MaintenanceRequest, (m) => m.lease)
  maintenanceRequests: MaintenanceRequest[];
}
