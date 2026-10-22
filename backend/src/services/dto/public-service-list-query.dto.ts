import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PagePaginationQueryDto } from '../../common/dto/page-pagination-query.dto';

export class PublicServiceListQueryDto extends PagePaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  subcategoryId?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  activeOnly = 'false';
}
