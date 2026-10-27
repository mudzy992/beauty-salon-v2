import { resolveCorsRuntimeConfig } from './cors-runtime-config';

describe('resolveCorsRuntimeConfig', () => {
  it('uses a narrow localhost allowlist outside production', () => {
    expect(resolveCorsRuntimeConfig({ NODE_ENV: 'test' }).allowedOrigins).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8081',
      'http://127.0.0.1:8081',
    ]);
  });

  it.each(['production', 'staging'])(
    'requires an explicit allowlist in %s',
    (NODE_ENV) => {
      expect(() => resolveCorsRuntimeConfig({ NODE_ENV })).toThrow(
        'CORS_ALLOWED_ORIGINS must be configured outside development and test.',
      );
    },
  );

  it('normalizes and deduplicates exact configured origins', () => {
    expect(
      resolveCorsRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS:
          'https://salon.example, https://admin.example,https://salon.example',
      }).allowedOrigins,
    ).toEqual(['https://salon.example', 'https://admin.example']);
  });

  it.each([
    '*',
    'https://*.example.com',
    'https://salon.example/path',
    'https://user:pass@salon.example',
    'http://salon.example',
    'null',
  ])('rejects unsafe production origin configuration: %s', (origins) => {
    expect(() =>
      resolveCorsRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: origins,
      }),
    ).toThrow();
  });

  it('rejects empty list elements instead of silently ignoring them', () => {
    expect(() =>
      resolveCorsRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://salon.example,',
      }),
    ).toThrow('CORS_ALLOWED_ORIGINS contains an invalid origin list.');
  });
});
