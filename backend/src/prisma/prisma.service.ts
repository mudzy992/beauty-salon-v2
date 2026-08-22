import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const provider =
      configService.get<string>('DATABASE_PROVIDER')?.toLowerCase() ??
      'postgres';
    const url = configService.get<string>('DATABASE_URL');

    if (!url) {
      throw new Error('DATABASE_URL nije postavljen.');
    }

    if (provider !== 'postgres') {
      throw new Error(
        `Nepodržan DATABASE_PROVIDER: ${provider}. Ovaj build koristi PostgreSQL.`,
      );
    }

    const adapter = new PrismaPg({ connectionString: url });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
