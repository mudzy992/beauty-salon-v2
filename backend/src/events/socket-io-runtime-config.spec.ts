import { resolveSocketIoRuntimeConfig } from './socket-io-runtime-config';

describe('resolveSocketIoRuntimeConfig', () => {
  it('uses the local adapter by default for single-instance development', () => {
    expect(resolveSocketIoRuntimeConfig({})).toEqual({
      multiInstance: false,
      redisUrl: undefined,
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
    ).toEqual({ multiInstance: false, redisUrl: undefined });
  });

  it('requires Redis when multi-instance mode is explicitly enabled', () => {
    expect(() =>
      resolveSocketIoRuntimeConfig({ SOCKET_IO_MULTI_INSTANCE: 'true' }),
    ).toThrow('SOCKET_IO_REDIS_URL is required');
  });

  it('normalizes the multi-instance mode and Redis URL', () => {
    expect(
      resolveSocketIoRuntimeConfig({
        SOCKET_IO_MULTI_INSTANCE: ' TRUE ',
        SOCKET_IO_REDIS_URL: ' rediss://redis.example:6379 ',
      }),
    ).toEqual({
      multiInstance: true,
      redisUrl: 'rediss://redis.example:6379',
    });
  });

  it('rejects malformed mode and unsupported URL schemes without echoing the URL', () => {
    expect(() =>
      resolveSocketIoRuntimeConfig({ SOCKET_IO_MULTI_INSTANCE: 'yes' }),
    ).toThrow('SOCKET_IO_MULTI_INSTANCE must be');
    expect(() =>
      resolveSocketIoRuntimeConfig({
        SOCKET_IO_REDIS_URL: 'https://redis.example:6379',
      }),
    ).toThrow('SOCKET_IO_REDIS_URL must use redis:// or rediss://');
  });
});
