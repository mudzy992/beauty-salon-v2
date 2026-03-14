import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelReservationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
