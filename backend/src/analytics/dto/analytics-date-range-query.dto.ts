import { Matches } from 'class-validator';
import { IsOptional } from 'class-validator';

export class AnalyticsDateRangeQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate?: string;
}
