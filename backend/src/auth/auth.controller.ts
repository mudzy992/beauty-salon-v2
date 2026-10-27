import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Public } from '../common/decorators/public.decorator';
import { AllowDuringPasswordChange } from '../common/decorators/allow-during-password-change.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { HttpRateLimit } from '../common/rate-limiting/http-rate-limit.decorator';
import {
  AUTH_LOGIN_ACCOUNT_LIMIT,
  AUTH_LOGIN_ACCOUNT_WINDOW_SECONDS,
  AUTH_LOGIN_IP_LIMIT,
  AUTH_RATE_LIMIT_WINDOW_SECONDS,
  AUTH_REGISTER_IP_LIMIT,
  AUTH_REGISTER_IP_WINDOW_SECONDS,
  AUTH_SEND_VERIFICATION_IP_LIMIT,
  AUTH_SEND_VERIFICATION_IP_WINDOW_SECONDS,
  AUTH_SEND_VERIFICATION_USER_LIMIT,
  AUTH_SEND_VERIFICATION_USER_WINDOW_SECONDS,
  AUTH_VERIFY_EMAIL_IP_LIMIT,
  AUTH_VERIFY_EMAIL_WINDOW_SECONDS,
} from '../common/rate-limiting/http-rate-limit.constants';

const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Public()
  @Post('register')
  @HttpRateLimit({
    bucket: 'auth:register:ip',
    limit: AUTH_REGISTER_IP_LIMIT,
    windowSeconds: AUTH_REGISTER_IP_WINDOW_SECONDS,
    identity: 'ip',
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: AVATAR_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file) return cb(null, true);
        if (!AVATAR_MIMES.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Avatar mora biti slika (JPEG, PNG, WebP ili GIF).',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    let avatarPath: string | undefined;
    if (avatar) {
      const result = await this.uploadsService.saveFile(avatar, 'avatars');
      avatarPath = result.pathThumb || result.pathSmall || result.pathOriginal;
    }
    return this.authService.register({ ...dto, avatar: avatarPath });
  }

  @Public()
  @Post('login')
  @HttpRateLimit([
    {
      bucket: 'auth:login:ip',
      limit: AUTH_LOGIN_IP_LIMIT,
      windowSeconds: AUTH_RATE_LIMIT_WINDOW_SECONDS,
      identity: 'ip',
    },
    {
      bucket: 'auth:login:account',
      limit: AUTH_LOGIN_ACCOUNT_LIMIT,
      windowSeconds: AUTH_LOGIN_ACCOUNT_WINDOW_SECONDS,
      identity: 'account',
      accountField: 'login',
    },
  ])
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @AllowDuringPasswordChange()
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  @Post('send-verification-email')
  @UseGuards(JwtAuthGuard)
  @HttpRateLimit([
    {
      bucket: 'auth:send-verification:user',
      limit: AUTH_SEND_VERIFICATION_USER_LIMIT,
      windowSeconds: AUTH_SEND_VERIFICATION_USER_WINDOW_SECONDS,
      identity: 'user',
    },
    {
      bucket: 'auth:send-verification:ip',
      limit: AUTH_SEND_VERIFICATION_IP_LIMIT,
      windowSeconds: AUTH_SEND_VERIFICATION_IP_WINDOW_SECONDS,
      identity: 'ip',
    },
  ])
  async sendVerificationEmail(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.sendVerificationEmail(user.sub);
  }

  @Public()
  @Post('verify-email')
  @HttpRateLimit({
    bucket: 'auth:verify-email:ip',
    limit: AUTH_VERIFY_EMAIL_IP_LIMIT,
    windowSeconds: AUTH_VERIFY_EMAIL_WINDOW_SECONDS,
    identity: 'ip',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }
}
