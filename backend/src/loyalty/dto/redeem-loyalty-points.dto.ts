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

export class RedeemLoyaltyPointsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  points!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsUUID()
  idempotencyKey!: string;
}
