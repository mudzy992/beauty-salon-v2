import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

type MigrationStatus = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  health() {
    return { ok: true, service: 'beauty-salon-v2-backend' };
  }

  @Get('health/ready')
  @Public()
  async readiness() {
    try {
      const migrationDirectory = join(process.cwd(), 'prisma', 'migrations');
      const expectedMigrations = (
        await readdir(migrationDirectory, {
          withFileTypes: true,
        })
      )
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      const migrationRows = await this.prisma.$queryRaw<MigrationStatus[]>`
        SELECT migration_name, finished_at, rolled_back_at
        FROM "_prisma_migrations"
      `;
      const appliedMigrations = new Set(
        migrationRows
          .filter((row) => row.finished_at && !row.rolled_back_at)
          .map((row) => row.migration_name),
      );
      const hasUnfinishedMigration = migrationRows.some(
        (row) => !row.finished_at && !row.rolled_back_at,
      );
      const hasPendingMigration = expectedMigrations.some(
        (name) => !appliedMigrations.has(name),
      );

      if (
        expectedMigrations.length === 0 ||
        hasUnfinishedMigration ||
        hasPendingMigration
      ) {
        throw new Error('Database schema is not ready.');
      }

      return { ok: true, service: 'beauty-salon-v2-backend' };
    } catch {
      // Keep database errors and connection details out of this public probe.
      throw new ServiceUnavailableException('Backend is not ready.');
    }
  }
}
