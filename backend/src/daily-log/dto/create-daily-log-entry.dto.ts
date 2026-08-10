import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import { DailyLogServiceItemDto } from './daily-log-service-item.dto';

export class CreateDailyLogEntryDto {
  @IsUUID()
  stylistProfileId!: string;

  @IsOptional()
  @IsUUID()
  reservationId?: string;

  /** Backwards-compat (legacy clients). Prefer `items` / `serviceIds`. */
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  /** Multi-service entry (legacy without per-item price). */
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  serviceIds?: string[];

  /** Preferred: services with editable unit prices. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyLogServiceItemDto)
  items?: DailyLogServiceItemDto[];

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsDateString()
  date!: string;

  /** Iznos naplate koji je klijent stvarno platio. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  /** Backwards-compat. Prefer `paidAmount`. */
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

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  desiredLoyaltyPercent?: number;

  @IsOptional()
  isManual?: boolean;
}
