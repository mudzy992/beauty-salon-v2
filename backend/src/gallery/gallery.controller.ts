import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GalleryService } from './gallery.service';
import { CreateGalleryCategoryDto, UpdateGalleryCategoryDto } from './dto/create-category.dto';
import { CreateGalleryImageDto } from './dto/create-image.dto';
import { UploadGalleryImageDto } from './dto/upload-gallery-image.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { HttpRateLimit } from '../common/rate-limiting/http-rate-limit.decorator';
import {
  HTTP_RATE_LIMIT_PUBLIC_IP,
  HTTP_RATE_LIMIT_WINDOW_SECONDS,
} from '../common/rate-limiting/http-rate-limit.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('api/gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  createCategory(@Body() dto: CreateGalleryCategoryDto) {
    return this.gallery.createCategory(dto);
  }

  @Get('categories')
  @Public()
  @HttpRateLimit({
    bucket: 'gallery:categories',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findAllCategories() {
    return this.gallery.findAllCategories();
  }

  @Get('categories/:id')
  @Public()
  @HttpRateLimit({
    bucket: 'gallery:category-detail',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findOneCategory(@Param('id') id: string) {
    return this.gallery.findOneCategory(id);
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateGalleryCategoryDto,
  ) {
    return this.gallery.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeCategory(@Param('id') id: string) {
    return this.gallery.removeCategory(id);
  }

  @Get('eligible-consented-images')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getEligibleConsentedImages() {
    return this.gallery.getEligibleConsentedImages();
  }

  @Post('categories/:id/images/upload')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file?.originalname) {
          cb(new BadRequestException('Nijedna datoteka nije poslata.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadNonClientImage(
    @Param('id') categoryId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadGalleryImageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) throw new BadRequestException('Nijedna datoteka nije poslata.');
    const sortOrder = dto.sortOrder === undefined ? undefined : Number(dto.sortOrder);
    if (sortOrder !== undefined && !Number.isSafeInteger(sortOrder)) {
      throw new BadRequestException('Redoslijed fotografije nije validan.');
    }
    return this.gallery.uploadNonClientImage(categoryId, file, user.sub, {
      nonClientAssetConfirmed: dto.nonClientAssetConfirmed,
      title: dto.title,
      description: dto.description,
      sortOrder,
    });
  }

  @Post('images')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  addImage(@Body() dto: CreateGalleryImageDto) {
    return this.gallery.addImage(dto);
  }

  @Patch('images/:id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateImage(
    @Param('id') id: string,
    @Body() dto: { title?: string; description?: string; sortOrder?: number },
  ) {
    return this.gallery.updateImage(id, dto);
  }

  @Delete('images/:id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeImage(@Param('id') id: string) {
    return this.gallery.removeImage(id);
  }
}
