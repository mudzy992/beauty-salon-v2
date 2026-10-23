import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
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
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockResolvedValue({ format: 'jpeg' }),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('webp')),
    toFile: jest.fn().mockResolvedValue(undefined),
  };
  return { __esModule: true, default: jest.fn(() => mockChain) };
});

const mockUploadsRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByStoredPath: jest.fn(),
  canReadPrivateUpload: jest.fn(),
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
    mockUploadsRepo.findById.mockResolvedValue(null);
    mockUploadsRepo.findByStoredPath.mockResolvedValue(null);
    mockUploadsRepo.canReadPrivateUpload.mockResolvedValue(false);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('fake'));
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.chmod as jest.Mock).mockResolvedValue(undefined);
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
      buffer: Buffer.alloc(100, 0x61),
      size: 100,
    } as Express.Multer.File;

    it('baca BadRequestException za nedozvoljen tip datoteke', async () => {
      const file = { ...validImageFile, mimetype: 'application/x-executable' };
      await expect(service.saveFile(file, 'uploads')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.saveFile(file, 'uploads')).rejects.toThrow(
        'Tip ili sadržaj datoteke nije dozvoljen.',
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
        expect.objectContaining({ recursive: true, mode: 0o700 }),
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

    it('stores generic images under the private root with PRIVATE classification', async () => {
      mockUploadsRepo.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'private-upload', ...data }),
      );
      const result = await service.saveFile(
        validImageFile,
        'daily-log',
        'stylist-1',
      );

      expect(result.pathOriginal).toMatch(/^private\/daily-log\//);
      expect(mockUploadsRepo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storageClass: 'PRIVATE',
          uploadedById: 'stylist-1',
        }),
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join('private', 'daily-log')),
        validImageFile.buffer,
        { flag: 'wx', mode: 0o600 },
      );
    });

    it('writes only sanitized public derivatives into an allowlisted public folder', async () => {
      mockUploadsRepo.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'public-upload', ...data }),
      );
      const result = await service.savePublicAsset(
        validImageFile,
        'brand',
        'owner-1',
      );

      expect(result.pathOriginal).toMatch(/^brand\/\d{4}\/\d{2}\/.+\.webp$/);
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(path.join('public', 'brand')),
        expect.objectContaining({ recursive: true, mode: 0o755 }),
      );
      expect(mockUploadsRepo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mimeType: 'image/webp',
          storageClass: 'PUBLIC',
          uploadedById: 'owner-1',
        }),
      });
    });

    it('rejects SVG uploads from the public asset flow', async () => {
      const svgFile = {
        ...validImageFile,
        originalname: 'logo.svg',
        mimetype: 'image/svg+xml',
      } as Express.Multer.File;
      await expect(
        service.savePublicAsset(svgFile, 'brand', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockUploadsRepo.create).not.toHaveBeenCalled();
    });

    it('does not allow unlisted public upload classes', async () => {
      await expect(
        service.savePublicAsset(validImageFile, 'gallery', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockUploadsRepo.create).not.toHaveBeenCalled();
    });

    it('creates consented derivatives outside the static public directory', async () => {
      mockUploadsRepo.findById.mockResolvedValue({
        id: 'original-1',
        pathOriginal: 'private/daily-log/2026/10/original.jpg',
        mimeType: 'image/jpeg',
        storageClass: 'PRIVATE',
        uploadedById: 'stylist-1',
      });
      mockUploadsRepo.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'consented-1', ...data }),
      );

      const result = await service.createConsentDerivative('original-1');

      expect(result.id).toBe('consented-1');
      expect(result.pathOriginal).toMatch(
        /^private\/consented\/\d{4}\/\d{2}\/.+\.webp$/,
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join('private', 'consented')),
        Buffer.from('webp'),
        { flag: 'wx', mode: 0o600 },
      );
      expect(mockUploadsRepo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storageClass: 'CONSENTED_PUBLIC',
          mimeType: 'image/webp',
          uploadedById: 'stylist-1',
        }),
      });
    });

    it('prihvaća PDF i ne generiše thumb/small/medium', async () => {
      const pdfFile = {
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n'),
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

  describe('readPrivateFile', () => {
    const privateUpload = {
      id: 'private-1',
      uploadedById: 'stylist-1',
      pathOriginal: 'private/daily-log/2026/10/original.jpg',
      pathThumb: 'private/daily-log/2026/10/thumb.webp',
      pathSmall: null,
      pathMedium: null,
      storageClass: 'PRIVATE',
      mimeType: 'image/jpeg',
    };

    it('returns 404 to a caller without a matching relationship', async () => {
      mockUploadsRepo.findByStoredPath.mockResolvedValue(privateUpload);
      mockUploadsRepo.canReadPrivateUpload.mockResolvedValue(false);
      await expect(
        service.readPrivateFile(privateUpload.pathOriginal, {
          sub: 'unrelated-client',
          roles: ['CLIENT'],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('serves a private image after the repository verifies its relationship', async () => {
      mockUploadsRepo.findByStoredPath.mockResolvedValue(privateUpload);
      mockUploadsRepo.canReadPrivateUpload.mockResolvedValue(true);
      const result = await service.readPrivateFile(privateUpload.pathOriginal, {
        sub: 'client-1',
        roles: ['CLIENT'],
      });
      expect(result).toMatchObject({ mimeType: 'image/jpeg', inline: true });
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join('/tmp/uploads', privateUpload.pathOriginal),
      );
      expect(mockUploadsRepo.canReadPrivateUpload).toHaveBeenCalledWith(
        privateUpload.id,
        'client-1',
        expect.arrayContaining([privateUpload.pathOriginal]),
      );
    });

    it('denies protected-file access to a consent derivative after its active relation is revoked', async () => {
      const consentDerivative = {
        ...privateUpload,
        id: 'consented-1',
        uploadedById: null,
        pathOriginal: 'private/consented/2026/10/client-photo.webp',
        pathThumb: null,
        storageClass: 'CONSENTED_PUBLIC',
        mimeType: 'image/webp',
      };
      mockUploadsRepo.findByStoredPath.mockResolvedValue(consentDerivative);
      mockUploadsRepo.canReadPrivateUpload.mockResolvedValue(false);

      await expect(
        service.readPrivateFile(consentDerivative.pathOriginal, {
          sub: 'client-1',
          roles: ['CLIENT'],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUploadsRepo.canReadPrivateUpload).toHaveBeenCalledWith(
        consentDerivative.id,
        'client-1',
        expect.arrayContaining([consentDerivative.pathOriginal]),
      );
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('does not let OWNER/uploader status bypass a revoked consent derivative', async () => {
      const consentDerivative = {
        ...privateUpload,
        id: 'consented-owner-upload',
        uploadedById: 'owner-1',
        pathOriginal: 'private/consented/2026/10/client-photo.webp',
        pathThumb: null,
        storageClass: 'CONSENTED_PUBLIC',
        mimeType: 'image/webp',
      };
      mockUploadsRepo.findByStoredPath.mockResolvedValue(consentDerivative);
      mockUploadsRepo.canReadPrivateUpload.mockResolvedValue(false);

      await expect(
        service.readPrivateFile(consentDerivative.pathOriginal, {
          sub: 'owner-1',
          roles: ['OWNER'],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUploadsRepo.canReadPrivateUpload).toHaveBeenCalledWith(
        consentDerivative.id,
        'owner-1',
        expect.arrayContaining([consentDerivative.pathOriginal]),
      );
      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('readConsentDerivative', () => {
    it('reads consent derivatives only from the private consented subtree', async () => {
      mockUploadsRepo.findById.mockResolvedValue({
        id: 'consented-1',
        pathOriginal: 'private/consented/2026/10/approved.webp',
        storageClass: 'CONSENTED_PUBLIC',
        mimeType: 'image/webp',
      });

      await expect(
        service.readConsentDerivative('consented-1'),
      ).resolves.toMatchObject({
        mimeType: 'image/webp',
        inline: true,
      });
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(
          '/tmp/uploads',
          'private',
          'consented',
          '2026',
          '10',
          'approved.webp',
        ),
      );
    });

    it('denies a consent derivative path that escapes its private subtree', async () => {
      mockUploadsRepo.findById.mockResolvedValue({
        id: 'consented-escape',
        pathOriginal: 'private/consented/../../public/brand.webp',
        storageClass: 'CONSENTED_PUBLIC',
        mimeType: 'image/webp',
      });

      await expect(
        service.readConsentDerivative('consented-escape'),
      ).rejects.toThrow(NotFoundException);
      expect(fs.readFile).not.toHaveBeenCalled();
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
