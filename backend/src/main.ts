import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './events/redis-io.adapter';
import { resolveRedisTlsOptions } from './common/redis/redis-tls-options';
import { resolveSocketIoRuntimeConfig } from './events/socket-io-runtime-config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Trust the single reverse-proxy hop provided by the approved Coolify topology.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const socketIoRuntime = resolveSocketIoRuntimeConfig(process.env);
  if (socketIoRuntime.multiInstance && socketIoRuntime.redisUrl) {
    const redisTlsOptions = resolveRedisTlsOptions({
      tls: process.env.REDIS_TLS,
      caCertPath: process.env.REDIS_CA_CERT_PATH,
      redisUrl: socketIoRuntime.redisUrl,
    });
    const redisIoAdapter = new RedisIoAdapter(
      app,
      socketIoRuntime.redisUrl,
      socketIoRuntime.channelPrefix,
      redisTlsOptions,
    );
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }
  app.enableShutdownHooks();

  // Consistent JSON for 404 and other HTTP exceptions
  app.useGlobalFilters(new HttpExceptionFilter());

  // Prisma Decimal fields (price, tipAmount, actualPrice, ...) serialize
  // as strings by default; the frontend/mobile clients type them as
  // `number`. Convert them to real JSON numbers so the wire format
  // matches what the clients already expect.
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());

  // Only explicitly approved, sanitized media is public under /uploads.
  // Legacy and unclassified files remain outside this static root.
  const uploadRoot = process.env.UPLOAD_ROOT || join(process.cwd(), 'uploads');
  const publicUploadRoot = join(uploadRoot, 'public');
  app.useStaticAssets(publicUploadRoot, {
    prefix: '/uploads/',
    dotfiles: 'deny',
    index: false,
    setHeaders: (response, filePath) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      const extension = extname(filePath).toLowerCase();
      if (extension === '.apk') {
        response.setHeader(
          'Content-Type',
          'application/vnd.android.package-archive',
        );
        response.setHeader('Content-Disposition', 'attachment');
        response.setHeader('Cache-Control', 'no-store');
      } else if (
        ['.html', '.htm', '.js', '.mjs', '.svg', '.xml'].includes(extension)
      ) {
        response.setHeader('Content-Type', 'application/octet-stream');
        response.setHeader('Content-Disposition', 'attachment');
        response.setHeader('Cache-Control', 'no-store');
      }
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: true, // configure for production
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
