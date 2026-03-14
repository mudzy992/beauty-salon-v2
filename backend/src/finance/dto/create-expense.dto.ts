import { IsNumber, IsOptional, IsString, IsUUID, IsArray, ValidateNested, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
  @MaxLength(2000)
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
