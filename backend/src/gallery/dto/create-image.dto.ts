import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateGalleryImageDto {
  @IsUUID()
  categoryId!: string;

  @IsUUID()
  uploadId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
