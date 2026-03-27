import { IsBoolean, IsOptional } from 'class-validator';

export class TestSmtpConnectionDto {
  @IsOptional()
  @IsBoolean()
  detailed?: boolean;
}
