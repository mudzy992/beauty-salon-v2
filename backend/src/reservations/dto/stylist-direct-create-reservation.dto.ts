import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import { RequireServiceSelectionConstraint } from './require-service-selection.validator';
import { MAX_RESERVATION_SERVICE_ITEMS } from '../utils/reservation-service-limits';

export class StylistDirectCreateReservationDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  @Validate(RequireServiceSelectionConstraint)
  serviceId?: string;

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
}
