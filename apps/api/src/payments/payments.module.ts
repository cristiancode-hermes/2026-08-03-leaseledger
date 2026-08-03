import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentPayment } from '../entities/rent-payment.entity';
import { Lease } from '../entities/lease.entity';
import { Unit } from '../entities/unit.entity';
import { Property } from '../entities/property.entity';
import { Tenant } from '../entities/tenant.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RentPayment, Lease, Unit, Property, Tenant]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
