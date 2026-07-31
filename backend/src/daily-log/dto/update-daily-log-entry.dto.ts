import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateDailyLogEntryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  desiredLoyaltyPercent?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  stylistProfileId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  serviceIds?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  clientId?: string | null;

  @IsOptional()
  @IsIn(['PENDING', 'COMPLETED'])
  status?: 'PENDING' | 'COMPLETED';
}
