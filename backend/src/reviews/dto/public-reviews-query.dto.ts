import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DEFAULT_PUBLIC_REVIEW_LIMIT,
  MAX_PUBLIC_REVIEW_LIMIT,
  MAX_PUBLIC_REVIEW_OFFSET,
} from '../reviews.constants';

export class PublicReviewsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  serviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  stylistProfileId?: string;

  // Older mobile clients send this; public responses remain approved-only.
  @IsOptional()
  @IsIn(['true'])
  approved?: 'true';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PUBLIC_REVIEW_LIMIT)
  limit?: number = DEFAULT_PUBLIC_REVIEW_LIMIT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PUBLIC_REVIEW_OFFSET)
  offset?: number = 0;
}
