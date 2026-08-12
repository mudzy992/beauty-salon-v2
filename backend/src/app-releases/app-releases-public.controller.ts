import { Controller, Get, NotFoundException } from '@nestjs/common';
import { AppReleasesService } from './app-releases.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('api/public/app-releases')
export class AppReleasesPublicController {
  constructor(private readonly appReleases: AppReleasesService) {}

  @Get('android/latest')
  @Public()
  async latestAndroid() {
    const latest = await this.appReleases.findLatestAndroidPublic();
    if (!latest) {
      throw new NotFoundException('Nema objavljenog Android release-a.');
    }
    return latest;
  }
}
