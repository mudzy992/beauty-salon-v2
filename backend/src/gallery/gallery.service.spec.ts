import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  galleryCategory: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  galleryImage: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('GalleryService', () => {
  let service: GalleryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GalleryService>(GalleryService);
  });

  it('findOneCategory baca NotFoundException kada kategorija ne postoji', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue(null);
    await expect(service.findOneCategory('nope')).rejects.toThrow(NotFoundException);
  });

  it('removeImage baca NotFoundException kada slika ne postoji', async () => {
    mockPrisma.galleryImage.findUnique.mockResolvedValue(null);
    await expect(service.removeImage('nope')).rejects.toThrow(NotFoundException);
  });
});
