import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Unit } from './unit.entity';
import { Lease } from './lease.entity';
import { User } from './user.entity';
import { moneyTransformer } from '../common/money';

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'heating'
  | 'appliance'
  | 'other';

export type MaintenancePriority = 'low' | 'med' | 'high';

export type MaintenanceStatus =
  | 'open'
  | 'assigned'
  | 'in-progress'
  | 'resolved';

@Entity('maintenance_requests')
export class MaintenanceRequest {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  unitId: string;

  @ManyToOne(() => Unit, (u) => u.maintenanceRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Column({ type: 'varchar', length: 40, nullable: true })
  leaseId: string | null;

  @ManyToOne(() => Lease, (l) => l.maintenanceRequests, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'leaseId' })
  lease: Lease | null;

  /** Who reported it (tenant user or landlord user). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  reportedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reportedById' })
  reportedBy: User | null;

  /** Who is working on it (landlord/manager user). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  assignedTo: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedTo' })
  assignee: User | null;

  @Column({ type: 'varchar', length: 20, default: 'other' })
  category: MaintenanceCategory;

  @Column({ type: 'varchar', length: 10, default: 'med' })
  priority: MaintenancePriority;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: MaintenanceStatus;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: moneyTransformer,
  })
  cost: number | null;

  @Column({ type: 'date', nullable: true })
  resolvedAt: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
