import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

const ROLE_VALUES = ['SYSTEM_ADMIN', 'OWNER', 'STYLIST', 'CLIENT'] as const;

export class CampaignAudienceDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  includeUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  excludeUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(ROLE_VALUES, { each: true })
  roles?: Array<(typeof ROLE_VALUES)[number]>;

  @IsOptional()
  @IsBoolean()
  onlyActive?: boolean;

  @IsOptional()
  @IsBoolean()
  onlyEmailVerified?: boolean;
}
