import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGalleryCategoryDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
