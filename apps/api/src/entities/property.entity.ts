import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Unit } from './unit.entity';
import { moneyTransformer } from '../common/money';

export type PropertyType = 'residential' | 'commercial' | 'garage';

@Entity('properties')
export class Property {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  ownerId: string;

  @ManyToOne(() => User, (u) => u.properties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  /** Assigned manager (nullable) — managers can only manage assigned properties. */
  @Index()
  @Column({ type: 'varchar', length: 40, nullable: true })
  managerId: string | null;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 20, default: 'residential' })
  type: PropertyType;

  /** Grace period in days before a payment is considered late (default 5). */
  @Column({ type: 'int', default: 5 })
  graceDays: number;

  /** Late fee as a decimal rate applied to the due amount (default 0.04 = 4%). */
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: 0.04,
    transformer: moneyTransformer,
  })
  lateFeeRate: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => Unit, (u) => u.property)
  units: Unit[];
}
