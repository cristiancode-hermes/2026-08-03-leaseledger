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
import { Property } from './property.entity';
import { Lease } from './lease.entity';
import { MaintenanceRequest } from './maintenance-request.entity';
import { moneyTransformer } from '../common/money';

export type UnitStatus = 'available' | 'occupied' | 'maintenance';

@Entity('units')
@Index(['propertyId', 'number'], { unique: true })
export class Unit {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  propertyId: string;

  @ManyToOne(() => Property, (p) => p.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  /** Unit code, unique per property (e.g. "A-101"). */
  @Column({ length: 20 })
  number: string;

  @Column({ type: 'int', default: 1 })
  bedrooms: number;

  @Column({ type: 'int', default: 1 })
  bathrooms: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  area: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  monthlyRent: number;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: UnitStatus;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => Lease, (l) => l.unit)
  leases: Lease[];

  @OneToMany(() => MaintenanceRequest, (m) => m.unit)
  maintenanceRequests: MaintenanceRequest[];
}
