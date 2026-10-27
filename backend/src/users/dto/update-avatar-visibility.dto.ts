import { IsBoolean } from 'class-validator';

export class UpdateAvatarVisibilityDto {
  @IsBoolean()
  isAvatarPublic!: boolean;
}
