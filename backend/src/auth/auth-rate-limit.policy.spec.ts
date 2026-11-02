import 'reflect-metadata';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../uploads/uploads.service', () => ({
  UploadsService: class UploadsService {},
}));

import { AuthController } from './auth.controller';
import {
  HTTP_RATE_LIMIT_METADATA,
  type HttpRateLimitPolicy,
} from '../common/rate-limiting/http-rate-limit.decorator';

describe('AuthController rate-limit policies', () => {
  const policiesFor = (handlerName: keyof AuthController) =>
    Reflect.getMetadata(
      HTTP_RATE_LIMIT_METADATA,
      AuthController.prototype[handlerName],
    ) as HttpRateLimitPolicy[] | undefined;

  it.each([
    {
      route: 'login' as const,
      buckets: ['auth:login:ip', 'auth:login:account'],
    },
    {
      route: 'sendVerificationEmail' as const,
      buckets: ['auth:send-verification:user', 'auth:send-verification:ip'],
    },
    {
      route: 'verifyEmail' as const,
      buckets: ['auth:verify-email:user', 'auth:verify-email:ip'],
    },
  ])(
    '$route has independent rate limits for each identity',
    ({ route, buckets }) => {
      expect(policiesFor(route)?.map(({ bucket }) => bucket)).toEqual(buckets);
    },
  );

  it('uses bounded per-IP and per-account login budgets', () => {
    expect(policiesFor('login')).toMatchObject([
      {
        bucket: 'auth:login:ip',
        limit: 30,
        windowSeconds: 60,
        identity: 'ip',
      },
      {
        bucket: 'auth:login:account',
        limit: 10,
        windowSeconds: 900,
        identity: 'account',
        accountField: 'login',
      },
    ]);
  });

  it('limits registrations by source IP and fails closed if Redis is unavailable', () => {
    expect(policiesFor('register')).toMatchObject([
      {
        bucket: 'auth:register:ip',
        limit: 10,
        windowSeconds: 3600,
        identity: 'ip',
        failClosedOnUnavailable: true,
      },
    ]);
  });

  it.each([
    'login' as const,
    'register' as const,
    'sendVerificationEmail' as const,
    'verifyEmail' as const,
  ])('$route rejects when its Redis counter is unavailable', (route) => {
    const policies = policiesFor(route);
    expect(policies?.length).toBeGreaterThan(0);
    expect(policies?.every((policy) => policy.failClosedOnUnavailable)).toBe(
      true,
    );
  });

  it('limits email verification by authenticated user and source IP', () => {
    expect(policiesFor('verifyEmail')).toMatchObject([
      {
        bucket: 'auth:verify-email:user',
        limit: 10,
        windowSeconds: 900,
        identity: 'user',
      },
      {
        bucket: 'auth:verify-email:ip',
        limit: 10,
        windowSeconds: 900,
        identity: 'ip',
      },
    ]);
  });
});
