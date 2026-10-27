import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateRuntimeSecrets } from './runtime-secrets';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateRuntimeSecrets,
    }),
  ],
})
export class ConfigModule {}
