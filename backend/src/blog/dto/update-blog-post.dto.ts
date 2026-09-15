import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excerpt?: string | null;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  heroImage?: string | null;

  @IsOptional()
  @IsString()
  ogImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string | null;

  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
