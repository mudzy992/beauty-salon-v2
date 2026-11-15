import { IsBoolean, IsDefined, IsIn, IsOptional, IsString, Matches, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

type RemovalMode = 'DELETE' | 'TRANSFER'

export class RemoveStylistRoleCategoryDto {
  @IsString()
  @IsIn(['DELETE', 'TRANSFER'])
  mode!: RemovalMode

  @IsOptional()
  @IsString()
  targetStylistProfileId?: string
}

export class RemoveStylistRoleDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  previewRevision!: string

  @IsOptional()
  @IsString()
  financialTargetStylistProfileId?: string

  @IsOptional()
  @IsBoolean()
  confirmFinancialTransfer?: boolean

  @IsDefined()
  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  dailyLogs!: RemoveStylistRoleCategoryDto

  @IsDefined()
  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  confirmedReservations!: RemoveStylistRoleCategoryDto

  @IsDefined()
  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  reservationResponses!: RemoveStylistRoleCategoryDto

  @IsDefined()
  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  reviews!: RemoveStylistRoleCategoryDto
}

