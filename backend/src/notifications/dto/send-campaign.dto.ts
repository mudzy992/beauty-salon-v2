import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignAudienceDto } from './campaign-audience.dto';

export class SendCampaignDto {
  @IsOptional()
  @IsUUID('4')
  idempotencyKey?: string;

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
  @ArrayMaxSize(100)
  @IsString({ each: true })
  tags?: string[];

  @ValidateNested()
  @Type(() => CampaignAudienceDto)
  audience!: CampaignAudienceDto;
}
