import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateClientDebtDto {
  @IsUUID()
  clientId!: string;

  @IsUUID()
  stylistProfileId!: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  manualEntryId?: string;

  @IsOptional()
  @IsUUID()
  reservationId?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

