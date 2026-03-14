import { IsBoolean, IsString } from 'class-validator';

export class SetPreferenceDto {
  @IsString()
  type!: string;

  @IsBoolean()
  pushEnabled!: boolean;

  @IsBoolean()
  emailEnabled!: boolean;
}
