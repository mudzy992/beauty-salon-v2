import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EXPENSE_LINE_ROLES } from '../utils/expense-line-roles';

export class CreateTemplateFieldDto {
  @IsString()
  @MaxLength(100)
  fieldName!: string;

  @IsString()
  fieldType!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsIn(EXPENSE_LINE_ROLES)
  lineRole?: (typeof EXPENSE_LINE_ROLES)[number];
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
