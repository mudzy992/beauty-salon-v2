import { IsNumber, IsOptional, IsString, IsUUID, IsArray, ValidateNested, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseFieldValueDto } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

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
}
