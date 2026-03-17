import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class StylistNoShowDto {
  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  applyPenalty?: boolean;
}

