import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Consistent JSON for 404 and other HTTP exceptions
  app.useGlobalFilters(new HttpExceptionFilter());

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
bootstrap();
