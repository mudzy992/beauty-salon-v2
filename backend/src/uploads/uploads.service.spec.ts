import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';
import * as fs from 'fs/promises';
import * as path from 'path';

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
});
