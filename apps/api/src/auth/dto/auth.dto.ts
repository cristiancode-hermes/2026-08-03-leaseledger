import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  @Length(8, 100, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsOptional()
  @IsIn(['landlord', 'manager'], {
    message: 'El rol debe ser landlord o manager',
  })
  role?: 'landlord' | 'manager';
}

export class LoginDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  password: string;
}
