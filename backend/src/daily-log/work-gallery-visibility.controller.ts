import { Body, Controller, Get, Header, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkGalleryVisibilityService } from './work-gallery-visibility.service';
import { DailyLogPublicService } from './daily-log-public.service';
import { MAX_BEFORE_AFTER_OFFSET } from './before-after-query.constants';

class VisibilityDto {
  @IsBoolean()
  hidden!: boolean;

  @IsBoolean()
  expectedHidden!: boolean;

  @IsString()
  @Matches(/^(0|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/)
  expectedRevision!: string;
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

class VisibleQueryDto extends HiddenQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_BEFORE_AFTER_OFFSET)
  declare offset: number;
}

@Controller('api/services/admin/work-gallery')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class WorkGalleryVisibilityController {
  constructor(private readonly visibility: WorkGalleryVisibilityService, private readonly feed: DailyLogPublicService) {}

  @Get(':serviceId/visible')
  @Header('Cache-Control', 'private, no-store')
  listVisible(@Param('serviceId') serviceId: string, @Query() query: VisibleQueryDto) {
    return this.feed.findBeforeAfterPairs({ serviceId, limit: query.limit, offset: query.offset }, true);
  }

  @Get(':serviceId/hidden')
  @Header('Cache-Control', 'private, no-store')
  listHidden(@Param('serviceId') serviceId: string, @Query() query: HiddenQueryDto) {
    return this.visibility.listHidden(serviceId, query.offset, query.limit);
  }

  @Patch(':serviceId/entries/:entryId/visibility')
  setVisibility(@Param('serviceId') serviceId: string, @Param('entryId') entryId: string, @Body() dto: VisibilityDto) {
    return this.visibility.setVisibility(serviceId, entryId, dto.hidden, dto.expectedHidden, dto.expectedRevision);
  }
}
