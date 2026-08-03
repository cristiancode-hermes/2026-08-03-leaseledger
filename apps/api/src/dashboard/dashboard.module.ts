import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../entities/property.entity';
import { Unit } from '../entities/unit.entity';
import { Lease } from '../entities/lease.entity';
import { Tenant } from '../entities/tenant.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      Unit,
      Lease,
      Tenant,
      RentPayment,
      MaintenanceRequest,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
