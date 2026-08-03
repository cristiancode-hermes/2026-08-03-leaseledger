import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  leaseId: string;

  @IsDateString()
  dueDate: string;

  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor que 0' })
  amount: number;

  @IsOptional()
  @IsIn(['transfer', 'cash', 'card'])
  method?: 'transfer' | 'cash' | 'card';

  @IsOptional()
  @IsDateString()
  paidDate?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsIn(['transfer', 'cash', 'card'])
  method?: 'transfer' | 'cash' | 'card';

  @IsOptional()
  @IsDateString()
  paidDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;
}
