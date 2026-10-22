import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_ANALYTICS_RANGE_MONTHS } from '../../common/analytics-date-range';
import { AnalyticsDateRangeQueryDto } from './analytics-date-range-query.dto';

export class AnalyticsDashboardQueryDto extends AnalyticsDateRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(9999)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ANALYTICS_RANGE_MONTHS)
  monthsBack?: number;
}

export const toAnalyticsDashboardParams = (
  query: AnalyticsDashboardQueryDto,
) => {
  const hasFromDate = query.fromDate !== undefined;
  const hasToDate = query.toDate !== undefined;
  const hasYear = query.year !== undefined;
  const hasMonth = query.month !== undefined;
  const hasMonthsBack = query.monthsBack !== undefined;

  if (hasFromDate !== hasToDate || hasYear !== hasMonth) {
    throw new BadRequestException(
      'Nedostaje dio analytics date range parametara.',
    );
  }

  const modeCount =
    Number(hasFromDate && hasToDate) +
    Number(hasYear && hasMonth) +
    Number(hasMonthsBack);
  if (modeCount > 1) {
    throw new BadRequestException(
      'Koristite samo jedan analytics date range format po zahtjevu.',
    );
  }

  if (hasFromDate && hasToDate) {
    return { fromDate: query.fromDate, toDate: query.toDate };
  }
  if (hasYear && hasMonth) {
    return { year: query.year, month: query.month };
  }
  if (hasMonthsBack) return { monthsBack: query.monthsBack };
  return {};
};
