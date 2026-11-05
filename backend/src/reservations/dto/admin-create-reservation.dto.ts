import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import { RequireServiceSelectionConstraint } from './require-service-selection.validator';
import { MAX_RESERVATION_SERVICE_ITEMS } from '../utils/reservation-service-limits';

export class AdminCreateReservationDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  @IsIn(['STANDARD', 'STAFF_ADMIN_DIRECT'])
  bookingMode!: 'STANDARD' | 'STAFF_ADMIN_DIRECT';

  @IsOptional()
  @IsUUID()
  stylistProfileId?: string;

  /** Backwards-compat (legacy UI). Prefer `serviceIds`. */
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
  reservationDate!: string; // YYYY-MM-DD

  @IsString()
  startTime!: string; // HH:mm

  @IsString()
  endTime!: string; // HH:mm

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clientNotes?: string;
}
