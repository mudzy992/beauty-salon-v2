import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DEFAULT_API_PAGE,
  DEFAULT_API_PAGE_LIMIT,
  MAX_API_PAGE_LIMIT,
  MAX_API_PAGE_OFFSET,
} from '../pagination.constants';

export class PagePaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_API_PAGE_OFFSET)
  page = DEFAULT_API_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_API_PAGE_LIMIT)
  pageSize = DEFAULT_API_PAGE_LIMIT;
}
