import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('landlord', 'manager')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('roll')
  roll(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    const m = month ?? currentMonth();
    return this.payments.roll(user, m);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="rent-roll.csv"')
  export(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.payments.exportCsv(user, month ?? currentMonth());
  }

  @Get('arrears')
  arrears(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.payments.arrears(user, propertyId);
  }

  @Get()
  history(
    @CurrentUser() user: AuthUser,
    @Query('leaseId') leaseId?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
  ) {
    return this.payments.history(user, { leaseId, month, status });
  }

  @Post()
  record(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.record(dto, user);
  }

  @Patch(':id')
  patch(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.patch(id, dto, user);
  }
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
