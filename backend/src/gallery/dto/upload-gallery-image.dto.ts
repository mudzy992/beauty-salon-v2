import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UploadGalleryImageDto {
  @IsIn(['true'])
  nonClientAssetConfirmed!: 'true';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Matches(/^\d{1,6}$/)
  sortOrder?: string;
}
