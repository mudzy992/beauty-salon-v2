import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFromReservationDto {
  /** Iznos naplaćen za trenutni termin (bez zatvaranja starih dugova). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  /**
   * Backwards-compat (legacy clients).
   * Ako je poslan, tretira se kao ukupno naplaćeno (često uključuje i zatvorena dugovanja).
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualPrice?: number;

  /** Opcionalno: suma zatvorenih dugova dodata na račun (ne ulazi u napojnicu). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  settledDebtsTotal?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  settledDebtIds?: string[];

  @IsOptional()
  @IsIn(['CREATE_DEBT', 'IGNORE_DEBT'])
  debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT';

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
