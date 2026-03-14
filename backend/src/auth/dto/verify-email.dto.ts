import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string; // verification token
}
