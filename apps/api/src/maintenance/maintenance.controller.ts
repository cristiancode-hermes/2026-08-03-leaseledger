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
import { MaintenanceService } from './maintenance.service';
import {
  AssignMaintenanceDto,
  CreateMaintenanceDto,
  ResolveMaintenanceDto,
} from './dto/maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('landlord', 'manager')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.maintenance.findAll(user, { status, priority, unitId });
  }

  @Get('mine')
  @Roles('tenant')
  @UseGuards(RolesGuard)
  findMine(@CurrentUser() user: AuthUser) {
    return this.maintenance.findMine(user);
  }

  @Post()
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthUser) {
    return this.maintenance.create(dto, user);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('landlord', 'manager')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignMaintenanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenance.assign(id, dto, user);
  }

  @Patch(':id/start')
  @UseGuards(RolesGuard)
  @Roles('landlord', 'manager')
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.maintenance.start(id, user);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('landlord', 'manager')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveMaintenanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenance.resolve(id, dto, user);
  }
}
