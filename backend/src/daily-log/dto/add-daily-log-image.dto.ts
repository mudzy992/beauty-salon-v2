import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AddDailyLogImageDto {
  @IsUUID()
  uploadId!: string;

  @IsOptional()
  @IsBoolean()
  isBefore?: boolean;

  @IsOptional()
  @IsBoolean()
  isAfter?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
