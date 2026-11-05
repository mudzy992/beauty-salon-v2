import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class DeleteServiceDto {
  @IsIn(['DELETE_LINKED_RECORDS', 'MERGE'])
  action: 'DELETE_LINKED_RECORDS' | 'MERGE';

  @IsString()
  @IsNotEmpty()
  confirmationName: string;

  @IsString()
  @IsNotEmpty()
  impactToken: string;

  @IsOptional()
  @IsUUID()
  targetServiceId?: string;
}
