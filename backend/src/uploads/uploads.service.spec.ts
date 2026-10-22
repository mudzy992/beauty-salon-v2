import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('fs/promises');
jest.mock('sharp', () => {
  const mockChain = {
    clone: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  };
  return { __esModule: true, default: jest.fn(() => mockChain) };
});

const mockUploadsRepo = {
  create: jest.fn(),
  findFirstByPathOriginal: jest.fn(),
  hasReferences: jest.fn(),
  deleteById: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'UPLOAD_ROOT') return '/tmp/uploads';
    return defaultValue;
  }),
};

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUploadsRepo.hasReferences.mockResolvedValue(false);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    mockUploadsRepo.create.mockResolvedValue({
      id: 'upload-1',
      pathOriginal: 'uploads/2026/03/file-original.jpg',
      pathThumb: 'uploads/2026/03/file-thumb.webp',
      pathSmall: 'uploads/2026/03/file-small.webp',
      pathMedium: 'uploads/2026/03/file-medium.webp',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: UploadsRepository, useValue: mockUploadsRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  describe('saveFile', () => {
    const validImageFile = {
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake'),
      size: 100,
    } as Express.Multer.File;

    it('baca BadRequestException za nedozvoljen tip datoteke', async () => {
      const file = { ...validImageFile, mimetype: 'application/x-executable' };
      await expect(service.saveFile(file, 'uploads')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.saveFile(file, 'uploads')).rejects.toThrow(
        'Tip datoteke nije dozvoljen.',
      );
      expect(mockUploadsRepo.create).not.toHaveBeenCalled();
    });

    it('kreira direktorij i upisuje original za sliku', async () => {
      const result = await service.saveFile(
        validImageFile,
        'services',
        'user-1',
      );

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(path.join('services', '2026')),
        {
          recursive: true,
        },
      );
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockUploadsRepo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originalName: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
          uploadedById: 'user-1',
        }),
      });
      expect(result).toHaveProperty('id', 'upload-1');
      expect(result).toHaveProperty('pathOriginal');
    });

    it('prihvaća PDF i ne generiše thumb/small/medium', async () => {
      const pdfFile = {
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf'),
        size: 200,
      } as Express.Multer.File;
      mockUploadsRepo.create.mockResolvedValue({
        id: 'upload-2',
        pathOriginal: 'uploads/2026/03/doc-original.pdf',
        pathThumb: null,
        pathSmall: null,
        pathMedium: null,
      });

      const result = await service.saveFile(pdfFile, 'uploads');

      expect(result.pathOriginal).toBeDefined();
      expect(mockUploadsRepo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mimeType: 'application/pdf',
          pathThumb: null,
          pathSmall: null,
          pathMedium: null,
        }),
      });
    });
  });

  describe('deleteByPathOriginal', () => {
    const upload = {
      id: 'upload-delete-1',
      uploadedById: 'uploader-1',
      pathOriginal: 'documents/2026/10/file-original.pdf',
      pathThumb: null,
      pathSmall: null,
      pathMedium: null,
    };

    beforeEach(() => {
      mockUploadsRepo.findFirstByPathOriginal.mockResolvedValue(upload);
    });

    it('odbija brisanje tuđeg uploada od običnog prijavljenog korisnika', async () => {
      await expect(
        service.deleteByPathOriginal(upload.pathOriginal, {
          sub: 'other-user',
          roles: ['STYLIST'],
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUploadsRepo.hasReferences).not.toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
      expect(mockUploadsRepo.deleteById).not.toHaveBeenCalled();
    });

    it('dozvoljava uploaderu brisanje vlastitog nevezanog fajla', async () => {
      await expect(
        service.deleteByPathOriginal(upload.pathOriginal, {
          sub: 'uploader-1',
          roles: ['STYLIST'],
        }),
      ).resolves.toEqual({ deleted: true });

      expect(mockUploadsRepo.hasReferences).toHaveBeenCalledWith(upload.id, [
        upload.pathOriginal,
      ]);
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join('/tmp/uploads', upload.pathOriginal),
      );
      expect(mockUploadsRepo.deleteById).toHaveBeenCalledWith(upload.id);
    });

    it('dozvoljava OWNER/SYSTEM_ADMIN-u brisanje legacy uploada bez vlasnika', async () => {
      mockUploadsRepo.findFirstByPathOriginal.mockResolvedValue({
        ...upload,
        uploadedById: null,
      });

      await expect(
        service.deleteByPathOriginal(upload.pathOriginal, {
          sub: 'admin-1',
          roles: ['SYSTEM_ADMIN'],
        }),
      ).resolves.toEqual({ deleted: true });

      expect(mockUploadsRepo.deleteById).toHaveBeenCalledWith(upload.id);
    });

    it('odbija brisanje uploada na koji se postojeći podatak poziva', async () => {
      mockUploadsRepo.hasReferences.mockResolvedValue(true);

      await expect(
        service.deleteByPathOriginal(upload.pathOriginal, {
          sub: 'uploader-1',
          roles: ['STYLIST'],
        }),
      ).rejects.toThrow(ConflictException);

      expect(fs.unlink).not.toHaveBeenCalled();
      expect(mockUploadsRepo.deleteById).not.toHaveBeenCalled();
    });

    it.each(['../outside.pdf', '..\\outside.pdf'])(
      'odbija DB putanju koja izlazi iz upload root direktorija: %s',
      async (pathOriginal) => {
        mockUploadsRepo.findFirstByPathOriginal.mockResolvedValue({
          ...upload,
          pathOriginal,
        });

        await expect(
          service.deleteByPathOriginal(pathOriginal, {
            sub: 'uploader-1',
            roles: ['STYLIST'],
          }),
        ).rejects.toThrow(BadRequestException);

        expect(fs.unlink).not.toHaveBeenCalled();
        expect(mockUploadsRepo.deleteById).not.toHaveBeenCalled();
      },
    );
  });
});
