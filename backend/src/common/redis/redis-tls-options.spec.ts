import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveRedisTlsOptions } from './redis-tls-options';

describe('resolveRedisTlsOptions', () => {
  let tempDirectory: string;

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'redis-tls-config-'));
  });

  afterEach(() => {
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('keeps TLS disabled for a redis:// URL unless explicitly enabled', () => {
    expect(
      resolveRedisTlsOptions({ redisUrl: 'redis://redis.example:6379' }),
    ).toEqual({});
  });

  it('enables TLS and loads the configured CA certificate', () => {
    const caPath = join(tempDirectory, 'redis-ca.crt');
    const caContents = Buffer.from('synthetic test CA certificate');
    writeFileSync(caPath, caContents);

    expect(
      resolveRedisTlsOptions({
        tls: ' TRUE ',
        caCertPath: caPath,
        redisUrl: 'redis://redis.example:6379',
      }),
    ).toEqual({ tls: true, ca: caContents });
  });

  it('uses platform trust when TLS is enabled without a custom CA', () => {
    expect(
      resolveRedisTlsOptions({
        tls: 'true',
        redisUrl: 'redis://redis.example:6379',
      }),
    ).toEqual({ tls: true });
  });

  it('enables TLS automatically for rediss:// when REDIS_TLS is omitted', () => {
    expect(
      resolveRedisTlsOptions({ redisUrl: 'rediss://redis.example:6379' }),
    ).toEqual({ tls: true });
  });

  it('rejects malformed flags and conflicting CA/URL configuration', () => {
    expect(() => resolveRedisTlsOptions({ tls: 'yes' })).toThrow(
      'REDIS_TLS must be "true" or "false".',
    );
    expect(() =>
      resolveRedisTlsOptions({
        tls: 'false',
        redisUrl: 'rediss://redis.example:6379',
      }),
    ).toThrow('conflicts with a rediss:// Redis URL');
    expect(() =>
      resolveRedisTlsOptions({
        caCertPath: join(tempDirectory, 'redis-ca.crt'),
        redisUrl: 'redis://redis.example:6379',
      }),
    ).toThrow('REDIS_CA_CERT_PATH requires');
  });

  it('fails closed when the configured CA file is unreadable or empty', () => {
    expect(() =>
      resolveRedisTlsOptions({
        tls: 'true',
        caCertPath: join(tempDirectory, 'missing-ca.crt'),
      }),
    ).toThrow('Configured REDIS_CA_CERT_PATH is not readable.');

    const emptyCaPath = join(tempDirectory, 'empty-ca.crt');
    writeFileSync(emptyCaPath, '');
    expect(() =>
      resolveRedisTlsOptions({ tls: 'true', caCertPath: emptyCaPath }),
    ).toThrow('Configured REDIS_CA_CERT_PATH is empty.');
  });
});
