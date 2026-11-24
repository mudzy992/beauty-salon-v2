import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkGalleryVisibilityService } from './work-gallery-visibility.service';

class VisibilityDto {
  @IsBoolean()
  hidden!: boolean;

  @IsBoolean()
  expectedHidden!: boolean;
}

class HiddenQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483597)
  offset = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

@Controller('api/services/admin/work-gallery')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class WorkGalleryVisibilityController {
  constructor(private readonly visibility: WorkGalleryVisibilityService) {}

  @Get(':serviceId/hidden')
  listHidden(@Param('serviceId') serviceId: string, @Query() query: HiddenQueryDto) {
    return this.visibility.listHidden(serviceId, query.offset, query.limit);
  }

  @Patch(':serviceId/entries/:entryId/visibility')
  setVisibility(@Param('serviceId') serviceId: string, @Param('entryId') entryId: string, @Body() dto: VisibilityDto) {
    return this.visibility.setVisibility(serviceId, entryId, dto.hidden, dto.expectedHidden);
  }
}
