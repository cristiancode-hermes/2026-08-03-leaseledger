import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { Unit } from '../entities/unit.entity';
import { Property } from '../entities/property.entity';
import { Lease } from '../entities/lease.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceRequest,
      Unit,
      Property,
      Lease,
      Tenant,
      User,
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
