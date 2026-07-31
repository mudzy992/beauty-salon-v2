import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateIncomeBookManualEntryDto {
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  stylistProfileId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsNumber()
  @Min(0)
  paidAmount!: number;

  @IsOptional()
  @IsIn(['CREATE_DEBT', 'IGNORE_DEBT'])
  debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

