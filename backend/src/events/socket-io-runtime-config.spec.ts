import { resolveSocketIoRuntimeConfig } from './socket-io-runtime-config';

describe('resolveSocketIoRuntimeConfig', () => {
  it('uses the local adapter by default for single-instance development', () => {
    expect(resolveSocketIoRuntimeConfig({})).toEqual({
      multiInstance: false,
      redisUrl: undefined,
      channelPrefix: 'beauty-salon-v2:development',
    });
  });

  it('requires Redis by default in production', () => {
    expect(() =>
      resolveSocketIoRuntimeConfig({ NODE_ENV: 'production' }),
    ).toThrow('SOCKET_IO_REDIS_URL is required');
  });

  it('allows a production single-instance override when explicitly disabled', () => {
    expect(
      resolveSocketIoRuntimeConfig({
        NODE_ENV: 'production',
        SOCKET_IO_MULTI_INSTANCE: 'false',
      }),
    ).toEqual({
      multiInstance: false,
      redisUrl: undefined,
      channelPrefix: 'beauty-salon-v2:production',
    });
  });

  it('requires Redis when multi-instance mode is explicitly enabled', () => {
    expect(() =>
      resolveSocketIoRuntimeConfig({ SOCKET_IO_MULTI_INSTANCE: 'true' }),
    ).toThrow('SOCKET_IO_REDIS_URL is required');
  });

  it('normalizes the mode, Redis URL, and app-specific channel prefix', () => {
    expect(
      resolveSocketIoRuntimeConfig({
        NODE_ENV: 'production',
        SOCKET_IO_MULTI_INSTANCE: ' TRUE ',
        SOCKET_IO_REDIS_URL:
          ' rediss://beauty-salon-socketio:test-password@redis-core:6379 ',
        SOCKET_IO_REDIS_CHANNEL_PREFIX: ' beauty-salon-v2:production ',
      }),
    ).toEqual({
      multiInstance: true,
      redisUrl: 'rediss://beauty-salon-socketio:test-password@redis-core:6379',
      channelPrefix: 'beauty-salon-v2:production',
    });
  });

  it('requires a non-default ACL username and password for Redis', () => {
    expect(() =>
      resolveSocketIoRuntimeConfig({
        SOCKET_IO_MULTI_INSTANCE: 'true',
        SOCKET_IO_REDIS_URL: 'redis://redis-core:6379',
      }),
    ).toThrow('dedicated ACL username and password');
    expect(() =>
      resolveSocketIoRuntimeConfig({
        SOCKET_IO_MULTI_INSTANCE: 'true',
        SOCKET_IO_REDIS_URL: 'redis://default:test-password@redis-core:6379',
      }),
    ).toThrow('dedicated ACL username and password');
  });

  it('rejects a Redis URL when the single-instance override is selected', () => {
    expect(() =>
      resolveSocketIoRuntimeConfig({
        SOCKET_IO_MULTI_INSTANCE: 'false',
        SOCKET_IO_REDIS_URL:
          'redis://beauty-salon-socketio:test-password@redis-core:6379',
      }),
    ).toThrow('SOCKET_IO_REDIS_URL must be empty');
  });

  it('rejects malformed mode, unsupported URL schemes, and unsafe channel prefixes', () => {
    expect(() =>
      resolveSocketIoRuntimeConfig({ SOCKET_IO_MULTI_INSTANCE: 'yes' }),
    ).toThrow('SOCKET_IO_MULTI_INSTANCE must be');
    expect(() =>
      resolveSocketIoRuntimeConfig({
        SOCKET_IO_REDIS_URL: 'https://redis-core:6379',
      }),
    ).toThrow('SOCKET_IO_REDIS_URL must use redis:// or rediss://');
    expect(() =>
      resolveSocketIoRuntimeConfig({
        SOCKET_IO_REDIS_CHANNEL_PREFIX: 'beauty-salon:*',
      }),
    ).toThrow('SOCKET_IO_REDIS_CHANNEL_PREFIX');
  });
});
