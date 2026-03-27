import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignAudienceDto } from './campaign-audience.dto';

export class SendCampaignDto {
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  subjectOverride?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  campaignName?: string;

  @IsOptional()
  @IsBoolean()
  createInAppNotification?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ValidateNested()
  @Type(() => CampaignAudienceDto)
  audience!: CampaignAudienceDto;
}
