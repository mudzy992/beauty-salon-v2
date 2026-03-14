import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkingHoursDto } from './working-hours.dto';

export class UpdateSalonSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  pauseBetweenServices?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(168)
  cancellationDeadlineHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCancellationsBeforePenalty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  penaltyDurationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(60)
  reservationLockMinutes?: number;

  @IsOptional()
  workingHours?: WorkingHoursDto[];
}
