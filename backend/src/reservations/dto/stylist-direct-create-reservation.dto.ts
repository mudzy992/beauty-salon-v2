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

export class StylistDirectCreateReservationDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  @Validate(RequireServiceSelectionConstraint)
  serviceId?: string;

  @IsOptional()
  @IsArray()
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
