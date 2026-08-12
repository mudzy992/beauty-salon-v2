import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppReleaseDto {
  @IsString()
  @MinLength(1)
  version!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionCode!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  minSupportedVersionCode!: number;

  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @IsString()
  @MinLength(1)
  apkPath!: string;

  @IsString()
  @MinLength(64)
  apkSha256!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  apkSizeBytes!: number;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
