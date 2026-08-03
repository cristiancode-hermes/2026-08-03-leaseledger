import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('landlord', 'manager')
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Get('properties/:propertyId/units')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.units.findByProperty(propertyId, user);
  }

  @Get('units/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.units.findOne(id, user);
  }

  @Post('units')
  create(@Body() dto: CreateUnitDto, @CurrentUser() user: AuthUser) {
    return this.units.create(dto, user);
  }

  @Patch('units/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.units.update(id, dto, user);
  }

  @Delete('units/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.units.remove(id, user);
  }
}
