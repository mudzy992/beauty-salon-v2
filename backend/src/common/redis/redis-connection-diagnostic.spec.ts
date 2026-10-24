import { describeRedisConnectionFailure } from './redis-connection-diagnostic';

describe('describeRedisConnectionFailure', () => {
  it('reports TLS hostname verification failures without exposing raw details', () => {
    const error = Object.assign(
      new Error(
        'redis://user:secret@example:6379 certificate hostname mismatch',
      ),
      { code: 'ERR_TLS_CERT_ALTNAME_INVALID' },
    );

    const diagnostic = describeRedisConnectionFailure(error);

    expect(diagnostic).toBe(
      'category=tls-hostname-mismatch code=ERR_TLS_CERT_ALTNAME_INVALID type=Error',
    );
    expect(diagnostic).not.toContain('secret');
    expect(diagnostic).not.toContain('example');
  });

  it('classifies TLS trust and protocol/port failures', () => {
    expect(
      describeRedisConnectionFailure(
        Object.assign(new Error('unable to verify certificate'), {
          code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        }),
      ),
    ).toBe(
      'category=tls-handshake code=UNABLE_TO_VERIFY_LEAF_SIGNATURE type=Error',
    );
    expect(
      describeRedisConnectionFailure(
        Object.assign(new Error('wrong protocol version'), {
          code: 'ERR_SSL_WRONG_VERSION_NUMBER',
        }),
      ),
    ).toBe(
      'category=tls-protocol-or-port code=ERR_SSL_WRONG_VERSION_NUMBER type=Error',
    );
  });

  it('classifies DNS, refused, timeout, reset, auth, and ACL failures', () => {
    const cases: Array<[Error, string]> = [
      [Object.assign(new Error('lookup failed'), { code: 'ENOTFOUND' }), 'dns'],
      [
        Object.assign(new Error('connect failed'), { code: 'ECONNREFUSED' }),
        'connection-refused',
      ],
      [
        Object.assign(new Error('operation timed out'), { code: 'ETIMEDOUT' }),
        'timeout',
      ],
      [
        Object.assign(new Error('connection lost'), { code: 'ECONNRESET' }),
        'connection-reset',
      ],
      [
        new Error('WRONGPASS invalid username-password pair'),
        'redis-authentication',
      ],
      [new Error('NOPERM command is not allowed'), 'redis-acl'],
    ];

    for (const [error, category] of cases) {
      expect(describeRedisConnectionFailure(error)).toContain(
        `category=${category}`,
      );
    }
  });

  it('omits arbitrary error messages for unclassified failures', () => {
    const diagnostic = describeRedisConnectionFailure(
      Object.assign(new Error('secret-password=do-not-log'), {
        code: 'SECRET_PASSWORD',
      }),
    );

    expect(diagnostic).toBe('category=other type=Error');
    expect(diagnostic).not.toContain('do-not-log');
  });
});
