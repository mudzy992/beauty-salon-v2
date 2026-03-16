import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryCategoryDto } from './dto/create-category.dto';
import { CreateGalleryImageDto } from './dto/create-image.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateGalleryCategoryDto) {
    return this.prisma.galleryCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.galleryCategory.findMany({
      include: { _count: { select: { images: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOneCategory(id: string) {
    const c = await this.prisma.galleryCategory.findUnique({
      where: { id },
      include: {
        images: { include: { upload: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!c) throw new NotFoundException('Kategorija nije pronađena.');
    return c;
  }

  async updateCategory(
    id: string,
    dto: { name?: string; description?: string; sortOrder?: number },
  ) {
    await this.findOneCategory(id);
    return this.prisma.galleryCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async removeCategory(id: string) {
    await this.findOneCategory(id);
    await this.prisma.galleryCategory.delete({ where: { id } });
    return { deleted: true };
  }

  async addImage(dto: CreateGalleryImageDto) {
    await this.prisma.galleryCategory.findUniqueOrThrow({
      where: { id: dto.categoryId },
    });
    return this.prisma.galleryImage.create({
      data: {
        categoryId: dto.categoryId,
        uploadId: dto.uploadId,
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { upload: true, category: true },
    });
  }

  async updateImage(
    id: string,
    dto: { title?: string; description?: string; sortOrder?: number },
  ) {
    const img = await this.prisma.galleryImage.findUnique({ where: { id } });
    if (!img) throw new NotFoundException('Slika nije pronađena.');
    return this.prisma.galleryImage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
      include: { upload: true, category: true },
    });
  }

  async removeImage(id: string) {
    const img = await this.prisma.galleryImage.findUnique({ where: { id } });
    if (!img) throw new NotFoundException('Slika nije pronađena.');
    await this.prisma.galleryImage.delete({ where: { id } });
    return { deleted: true };
  }
}
