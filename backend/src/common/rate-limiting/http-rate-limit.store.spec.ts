import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { HttpRateLimitStore } from './http-rate-limit.store';

jest.mock('redis', () => ({ createClient: jest.fn() }));

describe('HttpRateLimitStore', () => {
  let client: {
    isOpen: boolean;
    isReady: boolean;
    on: jest.Mock;
    connect: jest.Mock;
    eval: jest.Mock;
    close: jest.Mock;
  };

  const makeConfig = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    client = {
      isOpen: true,
      isReady: true,
      on: jest.fn().mockReturnThis(),
      connect: jest.fn().mockResolvedValue(undefined),
      eval: jest.fn().mockResolvedValue([1, 60]),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (createClient as jest.Mock).mockReturnValue(client);
  });

  it('uses a dedicated key prefix and hashes caller identity', async () => {
    const store = new HttpRateLimitStore(
      makeConfig({
        NODE_ENV: 'test',
        HTTP_RATE_LIMIT_REDIS_URL:
          'redis://http-rate-limit-user:test-only@redis.example:6379',
        HTTP_RATE_LIMIT_PREFIX: 'beauty-salon-v2:http-rate-limit:test',
      }),
    );
    store.onModuleInit();

    await expect(
      store.incrementWindow('blog:list', 'ip:203.0.113.10', 60),
    ).resolves.toEqual({ count: 1, ttlSeconds: 60 });

    const identityHash = createHash('sha256')
      .update('ip:203.0.113.10')
      .digest('hex');
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'redis://http-rate-limit-user:test-only@redis.example:6379',
      }),
    );
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringMatching(/INCR[\s\S]*TTL[\s\S]*EXPIRE/),
      {
        keys: [
          `beauty-salon-v2:http-rate-limit:test:blog:list:${identityHash}`,
        ],
        arguments: ['60'],
      },
    );

    await store.onModuleDestroy();
    expect(client.close).toHaveBeenCalledTimes(1);
  });

  it('fails open and warns once when Redis is not configured', async () => {
    const store = new HttpRateLimitStore(makeConfig({ NODE_ENV: 'test' }));
    const warning = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});

    store.onModuleInit();

    await expect(
      store.incrementWindow('availability:dates', 'user:user-1', 60),
    ).resolves.toBeNull();
    expect(createClient).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledTimes(1);

    warning.mockRestore();
  });

  it('fails open when an atomic Redis counter command errors', async () => {
    client.eval.mockRejectedValue(new Error('synthetic Redis failure'));
    const store = new HttpRateLimitStore(
      makeConfig({
        NODE_ENV: 'test',
        HTTP_RATE_LIMIT_REDIS_URL: 'redis://redis.example:6379',
      }),
    );
    store.onModuleInit();

    await expect(
      store.incrementWindow('analytics:dashboard', 'user:admin-1', 60),
    ).resolves.toBeNull();
  });
});
