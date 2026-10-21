export type SocketIoRuntimeConfig = {
  multiInstance: boolean;
  redisUrl?: string;
};

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
  if (multiInstance && !redisUrl) {
    throw new Error(
      'SOCKET_IO_REDIS_URL is required when SOCKET_IO_MULTI_INSTANCE=true.',
    );
  }

  return { multiInstance, redisUrl };
}
