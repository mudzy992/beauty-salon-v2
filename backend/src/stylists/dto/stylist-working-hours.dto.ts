import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StylistWorkingHoursDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsOptional()
  @IsString()
  dateOverride?: string; // YYYY-MM-DD za override po datumu

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isWorkingDay?: boolean;
}
