import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    const migrationEntries = await readdir(
      join(process.cwd(), 'prisma', 'migrations'),
      { withFileTypes: true },
    );
    prisma.$queryRaw.mockResolvedValue(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          migration_name: entry.name,
          finished_at: new Date(0),
          rolled_back_at: null,
        })),
    );

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('readiness', () => {
    it('returns healthy only after every tracked migration has succeeded', async () => {
      await expect(appController.readiness()).resolves.toEqual({
        ok: true,
        service: 'beauty-salon-v2-backend',
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('returns unavailable when a tracked migration is not in the database ledger', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);

      const readiness = appController.readiness();
      await expect(readiness).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(readiness).rejects.toThrow('Backend is not ready.');
    });

    it('returns a generic 503 when the database query fails', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(
        new Error('private database detail'),
      );

      const readiness = appController.readiness();
      await expect(readiness).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(readiness).rejects.toThrow('Backend is not ready.');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
