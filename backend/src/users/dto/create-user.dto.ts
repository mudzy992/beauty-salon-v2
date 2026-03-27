import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsIn(['MALE', 'FEMALE'])
  @IsOptional()
  gender?: 'MALE' | 'FEMALE';

  @IsString()
  @IsOptional()
  role?: string; // SYSTEM_ADMIN | OWNER | STYLIST | CLIENT (default: CLIENT)

  @IsString()
  @IsOptional()
  avatar?: string;
}
