import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('landlord', 'manager')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboard.dashboard(user);
  }

  @Get('my-lease')
  @UseGuards(RolesGuard)
  @Roles('tenant')
  myLease(@CurrentUser() user: AuthUser) {
    return this.dashboard.myLease(user);
  }
}
