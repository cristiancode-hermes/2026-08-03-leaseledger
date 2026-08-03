import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateMaintenanceDto {
  @IsString()
  unitId: string;

  @IsIn(['plumbing', 'electrical', 'heating', 'appliance', 'other'])
  category: 'plumbing' | 'electrical' | 'heating' | 'appliance' | 'other';

  @IsIn(['low', 'med', 'high'])
  priority: 'low' | 'med' | 'high';

  @IsString()
  @Length(3, 1000)
  description: string;
}

export class AssignMaintenanceDto {
  @IsString()
  assignedTo: string;
}

export class ResolveMaintenanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
