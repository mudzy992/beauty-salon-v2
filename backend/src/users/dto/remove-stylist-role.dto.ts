import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator'
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
  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  dailyLogs!: RemoveStylistRoleCategoryDto

  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  confirmedReservations!: RemoveStylistRoleCategoryDto

  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  reservationResponses!: RemoveStylistRoleCategoryDto

  @ValidateNested()
  @Type(() => RemoveStylistRoleCategoryDto)
  reviews!: RemoveStylistRoleCategoryDto
}

