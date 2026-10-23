import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { HttpRateLimit } from '../common/rate-limiting/http-rate-limit.decorator';
import {
  HTTP_RATE_LIMIT_PUBLIC_IP,
  HTTP_RATE_LIMIT_WINDOW_SECONDS,
} from '../common/rate-limiting/http-rate-limit.constants';
import { UploadsService } from '../uploads/uploads.service';
import { MediaConsentService } from './media-consent.service';

@Controller('api/media/consents')
export class MediaConsentController {
  constructor(
    private readonly consents: MediaConsentService,
    private readonly uploads: UploadsService,
  ) {}

  @Get('me')
  listForClient(@CurrentUser() user: CurrentUserPayload) {
    return this.consents.listForClient(user);
  }

  @Post(':imageId/grant')
  grantForClient(
    @Param('imageId') imageId: string,
    @Body('policyVersion') policyVersion: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consents.grantForClient(imageId, policyVersion, user);
  }

  @Delete(':imageId')
  revokeForClient(
    @Param('imageId') imageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consents.revokeForClient(imageId, user);
  }

  @Get(':consentId/file')
  @Public()
  @HttpRateLimit({
    bucket: 'media-consent:public-file',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  async readPublicConsentFile(
    @Param('consentId') consentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const uploadId = await this.consents.findActivePublicUploadId(consentId);
    const file = await this.uploads.readConsentDerivative(uploadId);
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; sandbox",
    );
    response.setHeader('Content-Type', 'image/webp');
    response.setHeader(
      'Content-Disposition',
      'inline; filename="consented-photo.webp"',
    );
    return new StreamableFile(file.buffer);
  }
}
