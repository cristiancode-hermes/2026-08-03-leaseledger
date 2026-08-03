import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeasesService } from './leases.service';
import {
  CreateLeaseDto,
  RenewLeaseDto,
  TerminateLeaseDto,
} from './dto/lease.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

@Controller('leases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('landlord', 'manager')
export class LeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('unitId') unitId?: string,
    @Query('status') status?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string,
  ) {
    return this.leases.findAll(user, {
      unitId,
      status,
      expiringWithinDays: expiringWithinDays
        ? Number(expiringWithinDays)
        : undefined,
    });
  }

  @Get('overlap-check')
  overlapCheck(
    @Query('unitId') unitId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.leases.overlapCheck(unitId, start, end);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leases.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateLeaseDto, @CurrentUser() user: AuthUser) {
    return this.leases.create(dto, user);
  }

  @Patch(':id/renew')
  renew(
    @Param('id') id: string,
    @Body() dto: RenewLeaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leases.renew(id, dto, user);
  }

  @Patch(':id/terminate')
  terminate(
    @Param('id') id: string,
    @Body() dto: TerminateLeaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leases.terminate(id, dto, user);
  }
}
