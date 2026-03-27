import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StylistWorkingHoursDto } from './stylist-working-hours.dto';

export class UpdateStylistProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE'])
  status?: 'PENDING' | 'ACTIVE';

  @IsOptional()
  @IsString()
  hireDate?: string | null; // YYYY-MM-DD

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];

  @IsOptional()
  workingHours?: StylistWorkingHoursDto[];
}
