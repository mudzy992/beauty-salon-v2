import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Lozinka mora imati najmanje 8 karaktera.' })
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  role: string; // SYSTEM_ADMIN | OWNER | STYLIST | CLIENT

  @IsString()
  @IsOptional()
  avatar?: string;
}
