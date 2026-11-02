import 'reflect-metadata';
import {
  HttpException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { HttpRateLimit } from './http-rate-limit.decorator';
import { HttpRateLimitInterceptor } from './http-rate-limit.interceptor';
import type { HttpRateLimitStore } from './http-rate-limit.store';

const POLICY = {
  bucket: 'test:route',
  limit: 2,
  windowSeconds: 60,
  identity: 'user' as const,
};

class TestController {
  @HttpRateLimit(POLICY)
  handler(this: void) {}
}

class PublicReadController {
  @HttpRateLimit({
    bucket: 'public:catalog-read',
    limit: 120,
    windowSeconds: 60,
    identity: 'ip',
  })
  handler(this: void) {}
}

class MultiPolicyController {
  @HttpRateLimit([
    {
      bucket: 'auth:login:ip',
      limit: 30,
      windowSeconds: 60,
      identity: 'ip',
      failClosedOnUnavailable: true,
    },
    {
      bucket: 'auth:login:account',
      limit: 10,
      windowSeconds: 900,
      identity: 'account',
      accountField: 'login',
      failClosedOnUnavailable: true,
    },
  ])
  handler(this: void) {}
}

class FailClosedController {
  @HttpRateLimit({
    bucket: 'auth:login:ip',
    limit: 30,
    windowSeconds: 60,
    identity: 'ip',
    failClosedOnUnavailable: true,
  })
  handler(this: void) {}
}

describe('HttpRateLimitInterceptor', () => {
  const mockStore = {
    incrementWindow: jest.fn(),
  };
  const request: {
    ip: string;
    user: { sub: string };
    body?: Record<string, unknown>;
  } = { ip: '203.0.113.10', user: { sub: 'user-1' } };
  const response = { setHeader: jest.fn<void, [string, string]>() };
  const next: CallHandler<string> = { handle: () => of('ok') };
  let interceptor: HttpRateLimitInterceptor;
  let context: ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    delete request.body;
    interceptor = new HttpRateLimitInterceptor(
      new Reflector(),
      mockStore as unknown as HttpRateLimitStore,
    );
    context = {
      getHandler: () => TestController.prototype.handler,
      getClass: () => TestController,
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  });

  it('uses the authenticated user bucket and emits remaining/reset headers', async () => {
    mockStore.incrementWindow.mockResolvedValue({ count: 1, ttlSeconds: 45 });

    const result = await interceptor.intercept(context, next);

    expect(mockStore.incrementWindow).toHaveBeenCalledWith(
      'test:route',
      'user:user-1',
      60,
    );
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '2');
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '1');
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Reset', '45');
    expect(response.setHeader).toHaveBeenCalledWith(
      'RateLimit-Policy',
      '2;w=60',
    );
    await expect(firstValueFrom(result)).resolves.toBe('ok');
  });

  it('checks both IP and normalized account identities for public auth routes', async () => {
    mockStore.incrementWindow
      .mockResolvedValueOnce({ count: 1, ttlSeconds: 60 })
      .mockResolvedValueOnce({ count: 9, ttlSeconds: 500 });
    request.body = {
      login: '  Test@Example.com  ',
    };
    context = {
      ...context,
      getHandler: () => MultiPolicyController.prototype.handler,
      getClass: () => MultiPolicyController,
    } as unknown as ExecutionContext;

    const result = await interceptor.intercept(context, next);

    expect(mockStore.incrementWindow).toHaveBeenNthCalledWith(
      1,
      'auth:login:ip',
      'ip:203.0.113.10',
      60,
    );
    expect(mockStore.incrementWindow).toHaveBeenNthCalledWith(
      2,
      'auth:login:account',
      'account:test@example.com',
      900,
    );
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '10');
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '1');
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Reset', '500');
    await expect(firstValueFrom(result)).resolves.toBe('ok');
  });

  it('returns 429 with Retry-After when the route budget is exceeded', async () => {
    mockStore.incrementWindow.mockResolvedValue({ count: 3, ttlSeconds: 17 });

    let error: unknown;
    try {
      await interceptor.intercept(context, next);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(HttpException);
    if (!(error instanceof HttpException)) {
      throw new Error('Expected a rate-limit HttpException');
    }
    expect(error.getStatus()).toBe(429);
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '0');
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '17');
  });

  it('returns a generic 503 with Retry-After for fail-closed policies', async () => {
    mockStore.incrementWindow.mockResolvedValue(null);
    context = {
      ...context,
      getHandler: () => FailClosedController.prototype.handler,
      getClass: () => FailClosedController,
    } as unknown as ExecutionContext;

    await expect(interceptor.intercept(context, next)).rejects.toMatchObject({
      status: 503,
      response: {
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Usluga je privremeno nedostupna. Pokušajte ponovo kasnije.',
      },
    });
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(mockStore.incrementWindow).toHaveBeenCalledTimes(1);
  });

  it('keeps public read policies fail-open when Redis is unavailable', async () => {
    mockStore.incrementWindow.mockResolvedValue(null);
    context = {
      ...context,
      getHandler: () => PublicReadController.prototype.handler,
      getClass: () => PublicReadController,
    } as unknown as ExecutionContext;

    const result = await interceptor.intercept(context, next);

    expect(mockStore.incrementWindow).toHaveBeenCalledWith(
      'public:catalog-read',
      'ip:203.0.113.10',
      60,
    );
    expect(response.setHeader).not.toHaveBeenCalled();
    await expect(firstValueFrom(result)).resolves.toBe('ok');
  });
});
