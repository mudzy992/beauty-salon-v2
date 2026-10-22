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

describe('HttpRateLimitInterceptor', () => {
  const mockStore = {
    incrementWindow: jest.fn(),
  };
  const request = { ip: '203.0.113.10', user: { sub: 'user-1' } };
  const response = { setHeader: jest.fn<void, [string, string]>() };
  const next: CallHandler<string> = { handle: () => of('ok') };
  let interceptor: HttpRateLimitInterceptor;
  let context: ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('fails open when Redis is unavailable', async () => {
    mockStore.incrementWindow.mockResolvedValue(null);

    const result = await interceptor.intercept(context, next);

    expect(response.setHeader).not.toHaveBeenCalled();
    await expect(firstValueFrom(result)).resolves.toBe('ok');
  });
});
