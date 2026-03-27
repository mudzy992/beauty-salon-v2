import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendTestEmailDto {
  @IsOptional()
  @IsEmail()
  to?: string;

  @IsOptional()
  @IsString()
  requestedByName?: string;
}
