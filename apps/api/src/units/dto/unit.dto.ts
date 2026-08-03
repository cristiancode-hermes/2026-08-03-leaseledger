import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateUnitDto {
  @IsString()
  propertyId: string;

  @IsString()
  @Length(1, 20)
  number: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsNumber()
  @Min(0.01, { message: 'La renta mensual debe ser mayor que 0' })
  monthlyRent: number;

  @IsOptional()
  @IsIn(['available', 'occupied', 'maintenance'])
  status?: 'available' | 'occupied' | 'maintenance';
}

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @Length(1, 20)
  number?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monthlyRent?: number;

  @IsOptional()
  @IsIn(['available', 'occupied', 'maintenance'])
  status?: 'available' | 'occupied' | 'maintenance';
}
