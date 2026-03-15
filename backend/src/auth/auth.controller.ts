import { Body, Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { UploadsService } from '../uploads/uploads.service';

const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Public()
  @Post('register')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: AVATAR_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file) return cb(null, true);
        if (!AVATAR_MIMES.has(file.mimetype)) {
          return cb(new BadRequestException('Avatar mora biti slika (JPEG, PNG, WebP ili GIF).'), false);
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
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
