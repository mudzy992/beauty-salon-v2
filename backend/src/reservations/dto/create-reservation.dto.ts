import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsArray,
  ArrayMaxSize,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { RequireServiceSelectionConstraint } from './require-service-selection.validator';
import { MAX_RESERVATION_SERVICE_ITEMS } from '../utils/reservation-service-limits';

export class CreateReservationDto {
  /** Backwards-compat (legacy clients). Prefer `serviceIds`. */
  @IsOptional()
  @IsUUID()
  @Validate(RequireServiceSelectionConstraint)
  serviceId?: string;

  /** Multi-service reservation. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RESERVATION_SERVICE_ITEMS, {
    message: `Rezervacija može sadržavati najviše ${MAX_RESERVATION_SERVICE_ITEMS} usluga.`,
  })
  @IsUUID(undefined, { each: true })
  serviceIds?: string[];

  @IsDateString()
  reservationDate!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clientNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  desiredLoyaltyPercent?: number;

  @IsOptional()
  @IsBoolean()
  payDebtsIntent?: boolean;
}
