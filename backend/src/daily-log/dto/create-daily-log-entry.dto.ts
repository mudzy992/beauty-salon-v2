import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDailyLogEntryDto {
  @IsUUID()
  stylistProfileId!: string;

  @IsOptional()
  @IsUUID()
  reservationId?: string;

  /** Backwards-compat (legacy clients). Prefer `serviceIds`. */
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  /** Multi-service entry. */
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  serviceIds?: string[];

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

  /** Opcionalno: procenat loyalty popusta koji klijent želi iskoristiti za ovaj zapis. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  desiredLoyaltyPercent?: number;

  @IsOptional()
  isManual?: boolean;
}
