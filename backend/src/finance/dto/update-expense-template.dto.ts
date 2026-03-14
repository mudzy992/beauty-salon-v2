import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateExpenseTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresAttachmentPerItem?: boolean;
}
