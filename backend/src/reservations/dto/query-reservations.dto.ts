import {
  IsOptional,
  IsDateString,
  IsIn,
  IsBoolean,
  IsInt,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryReservationsDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  /** Search by client firstName / lastName (partial, multi-token). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  clientSearch?: string;

  @IsOptional()
  @IsIn([
    'PENDING',
    'STYLIST_REVIEW',
    'CONFIRMED',
    'ATTENDANCE_CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED_BY_CLIENT',
    'CANCELLED_BY_STYLISTS',
    'NO_SHOW',
  ])
  status?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  asClient?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  asStylist?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  pageSize?: number;
}
