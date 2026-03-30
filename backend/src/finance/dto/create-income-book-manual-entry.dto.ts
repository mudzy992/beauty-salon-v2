import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateIncomeBookManualEntryDto {
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  stylistProfileId?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

