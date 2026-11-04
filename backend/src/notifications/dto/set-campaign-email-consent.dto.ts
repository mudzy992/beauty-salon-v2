import { IsBoolean } from 'class-validator';

export class SetCampaignEmailConsentDto {
  @IsBoolean()
  optedIn!: boolean;
}
