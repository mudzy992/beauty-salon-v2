import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdjustLoyaltyPointsDto {
  @Type(() => Number)
  @IsInt()
  @Min(-2_147_483_647)
  @Max(2_147_483_647)
  pointsDelta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsUUID()
  idempotencyKey!: string;
}
