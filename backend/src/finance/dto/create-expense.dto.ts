import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_EXPENSE_NOTES_PAYLOAD_LENGTH } from '../expense-constants';

export class ExpenseFieldValueDto {
  @IsUUID()
  fieldId!: string;

  @IsString()
  value!: string;
}

export class CreateExpenseDto {
  @IsUUID()
  bookId!: string;

  @IsUUID()
  categoryId!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @IsUUID()
  invoiceUploadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_EXPENSE_NOTES_PAYLOAD_LENGTH)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseFieldValueDto)
  fieldValues?: ExpenseFieldValueDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentUploadIds?: string[];
}
