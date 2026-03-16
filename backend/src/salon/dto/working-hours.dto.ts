import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkingHoursDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = nedjelja, 1 = ponedjeljak, ...

  @IsString()
  openTime: string; // "09:00"

  @IsString()
  closeTime: string; // "17:00"

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isWorkingDay?: boolean;
}
