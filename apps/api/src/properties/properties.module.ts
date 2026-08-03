import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../entities/property.entity';
import { Unit } from '../entities/unit.entity';
import { Lease } from '../entities/lease.entity';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Unit, Lease])],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
