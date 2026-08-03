import {
  IsEmail,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmergencyContactDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  relation?: string;
}

export class CreateTenantDto {
  @IsString()
  @Length(2, 150)
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @Length(3, 40)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(3, 40)
  nif?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 40)
  nif?: string | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}
