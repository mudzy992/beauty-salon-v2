export type SocketIoRuntimeConfig = {
  multiInstance: boolean;
  redisUrl?: string;
  channelPrefix: string;
};

const CHANNEL_PREFIX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]*$/;

export function resolveSocketIoRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): SocketIoRuntimeConfig {
  const rawMultiInstance = env.SOCKET_IO_MULTI_INSTANCE?.trim().toLowerCase();
  if (
    rawMultiInstance &&
    rawMultiInstance !== 'true' &&
    rawMultiInstance !== 'false'
  ) {
    throw new Error('SOCKET_IO_MULTI_INSTANCE must be "true" or "false".');
  }

  const multiInstance =
    rawMultiInstance === undefined || rawMultiInstance === ''
      ? env.NODE_ENV?.trim().toLowerCase() === 'production'
      : rawMultiInstance === 'true';
  const redisUrl = env.SOCKET_IO_REDIS_URL?.trim() || undefined;
  if (redisUrl && !/^rediss?:\/\//i.test(redisUrl)) {
    throw new Error('SOCKET_IO_REDIS_URL must use redis:// or rediss://.');
  }
  if (redisUrl) {
    let parsedRedisUrl: URL;
    try {
      parsedRedisUrl = new URL(redisUrl);
    } catch {
      throw new Error('SOCKET_IO_REDIS_URL must be a valid Redis URL.');
    }
    if (
      !parsedRedisUrl.username ||
      parsedRedisUrl.username === 'default' ||
      !parsedRedisUrl.password
    ) {
      throw new Error(
        'SOCKET_IO_REDIS_URL must use a dedicated ACL username and password.',
      );
    }
  }
  if (multiInstance && !redisUrl) {
    throw new Error(
      'SOCKET_IO_REDIS_URL is required when SOCKET_IO_MULTI_INSTANCE=true.',
    );
  }
  if (!multiInstance && redisUrl) {
    throw new Error(
      'SOCKET_IO_REDIS_URL must be empty when SOCKET_IO_MULTI_INSTANCE=false.',
    );
  }

  const environment = env.NODE_ENV?.trim().toLowerCase() || 'development';
  const channelPrefix =
    env.SOCKET_IO_REDIS_CHANNEL_PREFIX?.trim() ||
    `beauty-salon-v2:${environment}`;
  if (!CHANNEL_PREFIX_PATTERN.test(channelPrefix)) {
    throw new Error(
      'SOCKET_IO_REDIS_CHANNEL_PREFIX may contain only letters, numbers, colon, underscore, and hyphen.',
    );
  }

  return { multiInstance, redisUrl, channelPrefix };
}
