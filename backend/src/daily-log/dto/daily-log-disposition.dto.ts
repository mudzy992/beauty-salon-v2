import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export const DAILY_LOG_DISPOSITION_ACTIONS = [
  'discard',
  'reorder',
  'cancel_as_client',
  'cancel_as_stylist',
  'no_show',
] as const;

export type DailyLogDispositionAction =
  (typeof DAILY_LOG_DISPOSITION_ACTIONS)[number];

export class DailyLogDispositionDto {
  @IsIn(DAILY_LOG_DISPOSITION_ACTIONS)
  action!: DailyLogDispositionAction;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  targetStartTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  targetEndTime?: string;

  /** YYYY-MM-DD — optional new date when action is reorder. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetDate?: string;

  @IsOptional()
  applyPenalty?: boolean;
}
