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
  content?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
