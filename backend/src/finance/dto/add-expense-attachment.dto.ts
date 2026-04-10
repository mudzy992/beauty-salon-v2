import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddExpenseAttachmentDto {
  @IsUUID()
  uploadId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

