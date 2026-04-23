import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RepayClientDebtDto {
  /** Datum knjiženja (YYYY-MM-DD). Ako nije poslan, koristi se današnji datum. */
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

