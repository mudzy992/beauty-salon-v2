import { IsBoolean, IsOptional, IsString, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTemplateFieldDto {
  @IsString()
  @MaxLength(100)
  fieldName!: string;

  @IsString()
  fieldType!: string; // TEXT | NUMBER | CURRENCY | DATE | FILE

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}

export class CreateExpenseTemplateDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresAttachmentPerItem?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateFieldDto)
  fields?: CreateTemplateFieldDto[];
}
