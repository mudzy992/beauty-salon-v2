import { IsIn, IsOptional } from 'class-validator';
import { PagePaginationQueryDto } from '../../common/dto/page-pagination-query.dto';

export class PublicStylistListQueryDto extends PagePaginationQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  activeOnly = 'true';
}
