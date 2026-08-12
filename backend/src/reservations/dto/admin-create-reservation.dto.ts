import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import { RequireServiceSelectionConstraint } from './require-service-selection.validator';

export class AdminCreateReservationDto {
  @IsUUID()
  clientId!: string;

  /** Backwards-compat (legacy UI). Prefer `serviceIds`. */
  @IsOptional()
  @IsUUID()
  @Validate(RequireServiceSelectionConstraint)
  serviceId?: string;

  /** Multi-service reservation. */
  @IsOptional()
  @IsArray()
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

