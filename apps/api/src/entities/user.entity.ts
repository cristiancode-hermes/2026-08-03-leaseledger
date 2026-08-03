import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Property } from './property.entity';

export type UserRole = 'landlord' | 'manager' | 'tenant';

@Entity('users')
export class User {
  @PrimaryColumn('text')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'landlord' })
  role: UserRole;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => Property, (p) => p.owner)
  properties: Property[];
}
