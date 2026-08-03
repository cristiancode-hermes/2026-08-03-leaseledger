import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @Length(2, 150)
  name: string;

  @IsString()
  @Length(2, 255)
  address: string;

  @IsOptional()
  @IsIn(['residential', 'commercial', 'garage'])
  type?: 'residential' | 'commercial' | 'garage';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  graceDays?: number;

  @IsOptional()
  @Min(0)
  @Max(0.5)
  lateFeeRate?: number;
}

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  address?: string;

  @IsOptional()
  @IsIn(['residential', 'commercial', 'garage'])
  type?: 'residential' | 'commercial' | 'garage';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  graceDays?: number;

  @IsOptional()
  @Min(0)
  @Max(0.5)
  lateFeeRate?: number;

  @IsOptional()
  @IsString()
  managerId?: string | null;
}
