import { validateRuntimeSecrets } from './runtime-secrets';

describe('validateRuntimeSecrets', () => {
  const jwtSecret = 'a-test-only-jwt-secret-with-at-least-32-bytes';
  const encryptionKey = Buffer.from(
    'ci-only-test-encryption-key-32bytes',
  )
    .subarray(0, 32)
    .toString('base64');

  it('accepts a strong JWT secret and canonical 32-byte encryption key', () => {
    const config = {
      JWT_SECRET: jwtSecret,
      APP_SETTINGS_ENCRYPTION_KEY: encryptionKey,
      NODE_ENV: 'test',
    };

    expect(validateRuntimeSecrets(config)).toBe(config);
  });

  it.each([
    undefined,
    '',
    'change-me-in-production',
    'REPLACE_WITH_A_RANDOM_LOCAL_ONLY_SECRET',
    'short',
    `${jwtSecret} `,
  ])('rejects a missing, weak, or whitespace-padded JWT secret', (secret) => {
    expect(() =>
      validateRuntimeSecrets({
        JWT_SECRET: secret,
        APP_SETTINGS_ENCRYPTION_KEY: encryptionKey,
      }),
    ).toThrow('JWT_SECRET must be configured with at least 32 bytes.');
  });

  it.each([undefined, '', 'not-base64', Buffer.from('short').toString('base64')])(
    'rejects a missing or invalid settings encryption key',
    (key) => {
      expect(() =>
        validateRuntimeSecrets({
          JWT_SECRET: jwtSecret,
          APP_SETTINGS_ENCRYPTION_KEY: key,
        }),
      ).toThrow(
        'APP_SETTINGS_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes.',
      );
    },
  );

  it('does not expose secret values in configuration errors', () => {
    const weakJwt = 'unsafe-secret-value';
    let thrown: unknown;
    try {
      validateRuntimeSecrets({
        JWT_SECRET: weakJwt,
        APP_SETTINGS_ENCRYPTION_KEY: 'unsafe-key-value',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).not.toContain(weakJwt);
    expect(message).not.toContain('unsafe-key-value');
  });
});
