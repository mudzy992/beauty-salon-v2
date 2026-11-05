import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PagePaginationQueryDto } from '../../common/dto/page-pagination-query.dto';

export class ClientDebtListQueryDto extends PagePaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stylistProfileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
