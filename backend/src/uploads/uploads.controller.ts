import {
  Controller,
  Post,
  Delete,
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

  @Delete('by-path-original')
  async deleteByPathOriginal(@Body('pathOriginal') pathOriginal: string) {
    return this.uploadsService.deleteByPathOriginal(pathOriginal);
  }
}
