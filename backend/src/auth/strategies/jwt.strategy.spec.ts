import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const authService = { validateUser: jest.fn() };
  const configService = {
    getOrThrow: (_key: string) => 'test-secret',
  };
  const strategy = new JwtStrategy(
    configService as unknown as ConfigService,
    authService as unknown as AuthService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('forwards the signed password version for DB validation', async () => {
    const user = {
      sub: 'user-1',
      username: 'client',
      email: 'client@example.test',
      roles: ['CLIENT'],
    };
    authService.validateUser.mockResolvedValue(user);

    await expect(
      strategy.validate({ sub: 'user-1', pwdv: 123456789 }),
    ).resolves.toBe(user);
    expect(authService.validateUser).toHaveBeenCalledWith('user-1', 123456789);
  });

  it('rejects a token when its password version is no longer current', async () => {
    authService.validateUser.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'user-1', pwdv: 123456789 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
