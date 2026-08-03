import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Lease } from '../entities/lease.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Lease, RentPayment])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
