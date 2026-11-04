import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  MAX_API_PAGE_LIMIT,
  MAX_API_PAGE_OFFSET,
} from '../../common/pagination.constants';

/** Optional paging fields let migrated callers request an envelope while
 * preserving the bounded legacy-array response for one release cycle. */
export class OptionalPagePaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_API_PAGE_OFFSET)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_API_PAGE_LIMIT)
  pageSize?: number;
}
