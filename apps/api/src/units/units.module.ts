import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from '../entities/unit.entity';
import { Property } from '../entities/property.entity';
import { Lease } from '../entities/lease.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Unit,
      Property,
      Lease,
      RentPayment,
      MaintenanceRequest,
    ]),
  ],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
