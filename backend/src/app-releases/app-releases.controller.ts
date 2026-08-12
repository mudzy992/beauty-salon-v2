import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppReleasesService } from './app-releases.service';
import { CreateAppReleaseDto } from './dto/create-app-release.dto';
import { UpdateAppReleaseDto } from './dto/update-app-release.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const MAX_APK_SIZE = 100 * 1024 * 1024;

@Controller('api/app-releases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class AppReleasesController {
  constructor(private readonly appReleases: AppReleasesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_APK_SIZE },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nijedna datoteka nije poslata.');
    return this.appReleases.saveApk(file);
  }

  @Post()
  create(
    @Body() dto: CreateAppReleaseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appReleases.create(dto, user.sub);
  }

  @Get()
  findAll() {
    return this.appReleases.findAllAdmin();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppReleaseDto) {
    return this.appReleases.update(id, dto);
  }
}
