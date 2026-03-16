import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  stylistProfileId?: string;

  @IsOptional()
  @IsUUID()
  reservationId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stylistRating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
