import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './events/redis-io.adapter';
import { resolveSocketIoRuntimeConfig } from './events/socket-io-runtime-config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const socketIoRuntime = resolveSocketIoRuntimeConfig(process.env);
  if (socketIoRuntime.multiInstance && socketIoRuntime.redisUrl) {
    const redisIoAdapter = new RedisIoAdapter(
      app,
      socketIoRuntime.redisUrl,
      socketIoRuntime.channelPrefix,
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

  // Serve uploaded files at /uploads so frontend can use BASE_URL/uploads/... path
  const uploadRoot = process.env.UPLOAD_ROOT || join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadRoot, { prefix: '/uploads/' });

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
