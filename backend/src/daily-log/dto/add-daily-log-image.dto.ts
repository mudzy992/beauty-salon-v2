import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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
  sortOrder?: number;
}
