import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  date: string; // YYYY-MM-DD

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  sendPush?: boolean;
}
