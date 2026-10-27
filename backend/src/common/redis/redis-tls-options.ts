import { readFileSync } from 'node:fs';

export type RedisTlsOptions = {
  tls?: true;
  ca?: Buffer;
};

export type RedisTlsConfigInput = {
  tls?: string;
  caCertPath?: string;
  redisUrl?: string;
};

/**
 * Resolve TLS transport options shared by the Socket.IO adapter and HTTP
 * rate-limit Redis client. A rediss:// URL still enables TLS when REDIS_TLS
 * is omitted; a custom CA is loaded only from the configured runtime path.
 */
export function resolveRedisTlsOptions(
  config: RedisTlsConfigInput,
): RedisTlsOptions {
  const rawTls = config.tls?.trim().toLowerCase();
  if (rawTls && rawTls !== 'true' && rawTls !== 'false') {
    throw new Error('REDIS_TLS must be "true" or "false".');
  }

  const urlUsesTls = /^rediss:\/\//i.test(config.redisUrl?.trim() ?? '');
  if (rawTls === 'false' && urlUsesTls) {
    throw new Error('REDIS_TLS=false conflicts with a rediss:// Redis URL.');
  }

  const caCertPath = config.caCertPath?.trim();
  const tlsEnabled = rawTls === 'true' || urlUsesTls;
  if (caCertPath && !tlsEnabled) {
    throw new Error(
      'REDIS_CA_CERT_PATH requires REDIS_TLS=true or a rediss:// Redis URL.',
    );
  }
  if (!tlsEnabled) return {};
  if (!caCertPath) return { tls: true };

  let ca: Buffer;
  try {
    ca = readFileSync(caCertPath);
  } catch {
    throw new Error('Configured REDIS_CA_CERT_PATH is not readable.');
  }
  if (ca.length === 0) {
    throw new Error('Configured REDIS_CA_CERT_PATH is empty.');
  }

  return { tls: true, ca };
}
