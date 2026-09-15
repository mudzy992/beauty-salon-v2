import {
  IsBoolean,
  IsOptional,
  IsString,
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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excerpt?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
