import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../../auth/auth.controller';
import { AuthService } from '../../auth/auth.service';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { ALLOW_DURING_PASSWORD_CHANGE } from '../decorators/allow-during-password-change.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { UsersController } from '../../users/users.controller';
import { UsersService } from '../../users/users.service';
import { UploadsService } from '../../uploads/uploads.service';

const JWT_SECRET = 'forced-password-change-test-secret';

describe('forced password-change route policy', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const authService = {
    validateUser: jest.fn(async (sub: string) => ({
      sub,
      username: sub,
      email: '',
      roles: ['CLIENT'],
      mustChangePassword: sub === 'forced-user',
    })),
    changePassword: jest.fn().mockResolvedValue({
      message: 'Password changed.',
      access_token: 'replacement-token',
    }),
  };
  const usersService = {
    getProfile: jest.fn(async (userId: string) => ({
      id: userId,
      mustChangePassword: userId === 'forced-user',
    })),
    getProfileUsernameAvailability: jest.fn().mockResolvedValue({ available: true }),
    updateProfile: jest.fn().mockResolvedValue({ id: 'forced-user' }),
    create: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_SECRET }),
      ],
      controllers: [AuthController, UsersController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: UploadsService, useValue: { saveFile: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => JWT_SECRET },
        },
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const tokenFor = (sub: string) =>
    jwtService.sign({ sub, pwdv: 0 }, { expiresIn: '5m' });

  it('allows only profile bootstrap and password change for a forced account', async () => {
    const token = tokenFor('forced-user');

    await request(app.getHttpServer())
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.mustChangePassword).toBe(true));

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'temporary', newPassword: 'new-secret-password' })
      .expect(201)
      .expect(({ body }) => expect(body.access_token).toBe('replacement-token'));

    await request(app.getHttpServer())
      .get('/api/users/profile/username-availability?username=forced-user')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('PASSWORD_CHANGE_REQUIRED'));

    await request(app.getHttpServer())
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Blocked' })
      .expect(403);

    expect(usersService.getProfileUsernameAvailability).not.toHaveBeenCalled();
    expect(usersService.updateProfile).not.toHaveBeenCalled();
  });

  it('does not restrict accounts that have already changed their password', async () => {
    await request(app.getHttpServer())
      .get('/api/users/profile/username-availability?username=client')
      .set('Authorization', `Bearer ${tokenFor('regular-user')}`)
      .expect(200)
      .expect({ available: true });
  });

  it('marks only the real bootstrap and password-change handlers as allowed', () => {
    expect(
      Reflect.getMetadata(
        ALLOW_DURING_PASSWORD_CHANGE,
        UsersController.prototype.getProfile,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        ALLOW_DURING_PASSWORD_CHANGE,
        AuthController.prototype.changePassword,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        ALLOW_DURING_PASSWORD_CHANGE,
        UsersController.prototype.updateProfile,
      ),
    ).toBeUndefined();
  });
});
