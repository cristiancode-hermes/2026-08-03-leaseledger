import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Property,
  Unit,
  Tenant,
  Lease,
  RentPayment,
  MaintenanceRequest,
} from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Property,
      Unit,
      Tenant,
      Lease,
      RentPayment,
      MaintenanceRequest,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
