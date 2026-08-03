import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  User,
  Property,
  Unit,
  Tenant,
  Lease,
  RentPayment,
  MaintenanceRequest,
} from './entities/entities';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { TenantsModule } from './tenants/tenants.module';
import { LeasesModule } from './leases/leases.module';
import { PaymentsModule } from './payments/payments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SeedModule } from './seed/seed.module';
import { SeedService } from './seed/seed.service';
import { RolesGuard } from './auth/roles.guard';

const isPostgres = process.env.DATABASE_TYPE === 'postgres';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: isPostgres ? 'postgres' : 'better-sqlite3',
      ...(isPostgres
        ? {
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
          }
        : { database: process.env.DB_PATH || './data/leaseledger.db' }),
      entities: [
        User,
        Property,
        Unit,
        Tenant,
        Lease,
        RentPayment,
        MaintenanceRequest,
      ],
      synchronize: true,
    }),
    AuthModule,
    PropertiesModule,
    UnitsModule,
    TenantsModule,
    LeasesModule,
    PaymentsModule,
    MaintenanceModule,
    DashboardModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService, RolesGuard],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly seed: SeedService) {}

  async onModuleInit() {
    if (process.env.SEED_DB !== 'false') {
      await this.seed.seed();
    }
  }
}
