import {
  IsBoolean,
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
