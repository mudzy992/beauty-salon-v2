import { IsString, MaxLength, MinLength } from 'class-validator';

export class SettleClientDebtDto {
  /** Razlog otpisa – obavezan jer se dug zatvara bez knjiženja prihoda. */
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note!: string;
}
