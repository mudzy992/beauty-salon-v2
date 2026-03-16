import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
