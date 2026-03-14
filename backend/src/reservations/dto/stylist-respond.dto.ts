import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StylistRejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
