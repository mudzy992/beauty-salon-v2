import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  serviceId!: string;

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

  /** Opcionalno: broj loyalty bodova koje klijent želi iskoristiti za ovu rezervaciju. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  desiredLoyaltyPoints?: number;
}
