import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFromReservationDto {
  @IsNumber()
  @Min(0)
  actualPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
