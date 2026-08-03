import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateLeaseDto {
  @IsString()
  unitId: string;

  @IsString()
  tenantId: string;

  @IsDateString({}, { message: 'startDate debe ser una fecha válida' })
  startDate: string;

  @IsDateString({}, { message: 'endDate debe ser una fecha válida' })
  endDate: string;

  @IsNumber()
  @Min(0.01, { message: 'La renta mensual debe ser mayor que 0' })
  monthlyRent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;
}

export class RenewLeaseDto {
  @IsDateString({}, { message: 'endDate debe ser una fecha válida' })
  endDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monthlyRent?: number;
}

export class TerminateLeaseDto {
  @IsOptional()
  @IsDateString()
  terminatedAt?: string;
}

export class OverlapQueryDto {
  @IsString()
  unitId: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}
