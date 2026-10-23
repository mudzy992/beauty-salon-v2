import {
  Controller,
  Post,
  Delete,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { Response } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('api/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file?.originalname) {
          cb(new BadRequestException('Nijedna datoteka nije poslata.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
    @Body('entity') entity?: string,
  ) {
    if (!file) throw new BadRequestException('Nijedna datoteka nije poslata.');
    const folder = entity && /^[a-z0-9_-]+$/.test(entity) ? entity : 'uploads';
    return this.uploadsService.saveFile(file, folder, user.sub);
  }

  @Post('public')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file?.originalname) {
          cb(new BadRequestException('Nijedna datoteka nije poslata.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPublicAsset(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
    @Body('assetKind') assetKind?: string,
  ) {
    if (!file) throw new BadRequestException('Nijedna datoteka nije poslata.');
    return this.uploadsService.savePublicAsset(file, assetKind ?? '', user.sub);
  }

  @Get('content')
  async getPrivateContent(
    @Query('path') filePath: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.uploadsService.readPrivateFile(filePath, user);
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; sandbox",
    );
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `${file.inline ? 'inline' : 'attachment'}; filename="${file.fileName}"`,
    );
    return new StreamableFile(file.buffer);
  }

  @Delete('by-path-original')
  async deleteByPathOriginal(
    @Body('pathOriginal') pathOriginal: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.uploadsService.deleteByPathOriginal(pathOriginal, user);
  }
}
