import 'reflect-metadata';
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

  it('limits registrations by source IP', () => {
    expect(policiesFor('register')).toMatchObject([
      {
        bucket: 'auth:register:ip',
        limit: 10,
        windowSeconds: 3600,
        identity: 'ip',
      },
    ]);
  });

  it('limits email verification attempts by source IP', () => {
    expect(policiesFor('verifyEmail')).toMatchObject([
      {
        bucket: 'auth:verify-email:ip',
        limit: 10,
        windowSeconds: 900,
        identity: 'ip',
      },
    ]);
  });
});
