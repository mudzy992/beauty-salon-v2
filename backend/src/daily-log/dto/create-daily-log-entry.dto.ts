import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateDailyLogEntryDto {
  @IsUUID()
  stylistProfileId!: string;

  @IsOptional()
  @IsUUID()
  reservationId?: string;

  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsDateString()
  date!: string; // YYYY-MM-DD

  @IsNumber()
  @Min(0)
  actualPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  isManual?: boolean;
}
