import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminCreateReservationDto {
  @IsUUID()
  clientId!: string;

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
}

