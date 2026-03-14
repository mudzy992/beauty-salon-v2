import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  login: string; // email ili username

  @IsString()
  @IsNotEmpty()
  password: string;
}
