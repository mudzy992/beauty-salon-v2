import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAppReleaseDto {
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  minSupportedVersionCode?: number;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'RETIRED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
}
