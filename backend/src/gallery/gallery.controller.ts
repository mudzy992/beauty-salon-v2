import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { CreateGalleryCategoryDto } from './dto/create-category.dto';
import { CreateGalleryImageDto } from './dto/create-image.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

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
  findAllCategories() {
    return this.gallery.findAllCategories();
  }

  @Get('categories/:id')
  @Public()
  findOneCategory(@Param('id') id: string) {
    return this.gallery.findOneCategory(id);
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; sortOrder?: number },
  ) {
    return this.gallery.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeCategory(@Param('id') id: string) {
    return this.gallery.removeCategory(id);
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
