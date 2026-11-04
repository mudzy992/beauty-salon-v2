import { IsBoolean, IsUUID } from 'class-validator';

export class RetryCampaignJobDto {
  @IsBoolean()
  confirmAtLeastOnce!: boolean;

  @IsUUID('4')
  requestId!: string;
}
