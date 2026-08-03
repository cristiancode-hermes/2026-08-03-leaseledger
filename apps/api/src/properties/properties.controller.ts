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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('landlord', 'manager')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.properties.findAll(user, q);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.properties.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreatePropertyDto, @CurrentUser() user: AuthUser) {
    return this.properties.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.properties.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.properties.remove(id, user);
  }
}
