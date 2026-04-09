import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateIncomeBookManualEntryDto {
  @IsOptional()
  @IsDateString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  stylistProfileId?: string | null;

  @IsOptional()
  @IsUUID()
  clientId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsIn(['CREATE_DEBT', 'IGNORE_DEBT'])
  debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT';

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

