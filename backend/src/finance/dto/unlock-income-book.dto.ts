import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnlockIncomeBookDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}

