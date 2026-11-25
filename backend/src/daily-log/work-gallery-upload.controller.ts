import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { apiError } from '../common/errors/api-error-codes';
import { WorkGalleryUploadService } from './work-gallery-upload.service';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

class EligibleEntriesQuery {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

class CreatePairDto {
  @IsUUID()
  entryId!: string;
}

@Controller('api/services/admin/work-gallery')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class WorkGalleryUploadController {
  constructor(private readonly upload: WorkGalleryUploadService) {}

  @Get(':serviceId/eligible-entries')
  @Header('Cache-Control', 'private, no-store')
  listEligible(@Param('serviceId') serviceId: string, @Query() query: EligibleEntriesQuery) {
    return this.upload.listEligibleEntries(serviceId, query.offset, query.limit);
  }

  @Get(':serviceId/pending-consent')
  @Header('Cache-Control', 'private, no-store')
  listPending(@Param('serviceId') serviceId: string, @Query() query: EligibleEntriesQuery) {
    return this.upload.listPendingConsent(serviceId, query.offset, query.limit);
  }

  @Post(':serviceId/private-pair')
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'before', maxCount: 1 },
        { name: 'after', maxCount: 1 },
      ],
      {
        limits: { fileSize: MAX_PHOTO_BYTES, files: 2, fields: 2, fieldSize: 512 },
        fileFilter: (_req, file, cb) => {
          const mime = String(file?.mimetype ?? '').toLowerCase();
          if (!file?.originalname || !PHOTO_MIMES.has(mime)) {
            cb(new BadRequestException(apiError('WORK_GALLERY_PAIR_PHOTO_TYPE_INVALID')), false);
            return;
          }
          cb(null, true);
        },
      },
    ),
  )
  create(
    @Param('serviceId') serviceId: string,
    @Body() dto: CreatePairDto,
    @UploadedFiles()
    files: { before?: Express.Multer.File[]; after?: Express.Multer.File[] } | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const before = files?.before?.[0];
    const after = files?.after?.[0];
    this.upload.assertBothPhotos(before, after);
    return this.upload.createPair(serviceId, dto.entryId, before!, after!, user.sub);
  }
}
