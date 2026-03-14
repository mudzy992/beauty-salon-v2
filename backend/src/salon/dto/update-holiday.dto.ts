import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  sendPush?: boolean;
}
