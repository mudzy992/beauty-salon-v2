import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteDailyLogEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
