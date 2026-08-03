import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Lease } from './lease.entity';
import { moneyTransformer } from '../common/money';

export type PaymentStatus = 'due' | 'paid' | 'late' | 'overdue' | 'partial';
export type PaymentMethod = 'transfer' | 'cash' | 'card';

@Entity('rent_payments')
@Index(['leaseId', 'dueDate'], { unique: true })
export class RentPayment {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  leaseId: string;

  @ManyToOne(() => Lease, (l) => l.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaseId' })
  lease: Lease;

  /** Month this payment covers (YYYY-MM-DD, usually the 1st or the move-in day). */
  @Index()
  @Column({ type: 'date' })
  dueDate: string;

  /** Full amount due for this period (prorated for the first month). */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: moneyTransformer,
  })
  amount: number;

  /** Amount actually paid (0 until paid; partial payments leave arrears). */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  paidAmount: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  method: PaymentMethod | null;

  @Column({ type: 'date', nullable: true })
  paidAt: string | null;

  @Column({ type: 'varchar', length: 20, default: 'due' })
  status: PaymentStatus;

  /** Late fee applied once past the grace period. */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: moneyTransformer,
  })
  lateFee: number | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
