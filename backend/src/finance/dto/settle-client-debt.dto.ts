import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SettleClientDebtDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

