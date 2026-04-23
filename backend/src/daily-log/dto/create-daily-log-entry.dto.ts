import {
  IsArray,
  IsDateString,
  IsIn,
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

  /** Iznos naplate koji je klijent stvarno platio. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  /** Backwards-compat (legacy clients). Prefer `paidAmount`. */
  @IsNumber()
  @Min(0)
  actualPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsIn(['CREATE_DEBT', 'IGNORE_DEBT'])
  debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT';

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  settledDebtIds?: string[];

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
