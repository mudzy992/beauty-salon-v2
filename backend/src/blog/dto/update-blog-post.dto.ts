import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BLOG_POST_LANGUAGES } from '../../common/constants/blog-post-languages';

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

  /** WCAG 3.1.2 — jezik članka; frontend ga izdaje kao `lang` na sadržaju. */
  @IsOptional()
  @IsIn(BLOG_POST_LANGUAGES)
  language?: string;

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
