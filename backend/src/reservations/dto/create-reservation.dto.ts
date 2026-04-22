import {
  IsDateString,
  IsInt,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  /** Backwards-compat (legacy clients). Prefer `serviceIds`. */
  @IsOptional()
  @IsUUID()
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

  /** Opcionalno: procenat loyalty popusta koji klijent želi iskoristiti za ovu rezervaciju. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  desiredLoyaltyPercent?: number;
}
