import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EXPENSE_FIELD_TYPES } from './create-expense-template-field.dto';
import { EXPENSE_LINE_ROLES } from '../utils/expense-line-roles';

export class UpdateExpenseTemplateFieldDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fieldName?: string;

  @IsOptional()
  @IsIn(EXPENSE_FIELD_TYPES)
  fieldType?: (typeof EXPENSE_FIELD_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultValue?: string | null;

  @IsOptional()
  @IsIn(EXPENSE_LINE_ROLES)
  lineRole?: (typeof EXPENSE_LINE_ROLES)[number];
}
