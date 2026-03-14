import { IsNotEmpty, IsString } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string; // SYSTEM_ADMIN | OWNER | STYLIST | CLIENT
}
