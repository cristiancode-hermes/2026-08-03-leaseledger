import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Lease } from './lease.entity';
import { JSON_COL } from '../common/column-types';

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relation?: string;
}

@Entity('tenants')
export class Tenant {
  @PrimaryColumn('text')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  nif: string | null;

  @Column({ type: JSON_COL, nullable: true })
  emergencyContact: EmergencyContact | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => Lease, (l) => l.tenant)
  leases: Lease[];
}
