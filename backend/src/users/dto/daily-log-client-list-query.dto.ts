import { IsOptional, IsString, MaxLength } from 'class-validator';
import { OptionalPagePaginationQueryDto } from './optional-page-pagination-query.dto';

export class DailyLogClientListQueryDto extends OptionalPagePaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Used by edit forms to resolve the currently selected client beyond page 0. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientId?: string;
}
