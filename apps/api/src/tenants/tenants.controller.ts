import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('landlord', 'manager')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.tenants.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.tenants.remove(id);
  }
}
