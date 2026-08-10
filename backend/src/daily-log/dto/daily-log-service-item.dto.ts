import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class DailyLogServiceItemDto {
  @IsUUID()
  serviceId!: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class DailyLogServiceItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DailyLogServiceItemDto)
  items!: DailyLogServiceItemDto[];
}
