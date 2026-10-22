import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MAX_BEFORE_AFTER_OFFSET } from '../before-after-query.constants';

function isRandomMode(random: string | undefined): boolean {
  return random === '1' || random === 'true';
}

export class BeforeAfterQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  limit?: number;

  @ValidateIf((query: BeforeAfterQueryDto) => !isRandomMode(query.random))
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_BEFORE_AFTER_OFFSET)
  offset?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  serviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  random?: string;
}
