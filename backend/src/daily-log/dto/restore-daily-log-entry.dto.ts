import { IsDateString, IsOptional } from 'class-validator';

export class RestoreDailyLogEntryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
