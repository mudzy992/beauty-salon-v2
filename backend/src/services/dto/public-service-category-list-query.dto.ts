import { IsIn, IsOptional } from 'class-validator';
import { PagePaginationQueryDto } from '../../common/dto/page-pagination-query.dto';

export class PublicServiceCategoryListQueryDto extends PagePaginationQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  activeOnly = 'false';
}
