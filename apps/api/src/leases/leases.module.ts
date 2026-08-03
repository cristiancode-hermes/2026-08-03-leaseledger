import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lease } from '../entities/lease.entity';
import { Unit } from '../entities/unit.entity';
import { Tenant } from '../entities/tenant.entity';
import { Property } from '../entities/property.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { LeasesService } from './leases.service';
import { LeasesController } from './leases.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lease,
      Unit,
      Tenant,
      Property,
      RentPayment,
      MaintenanceRequest,
    ]),
    AuthModule,
  ],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
