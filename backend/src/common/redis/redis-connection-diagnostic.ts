const SAFE_ERROR_CODE =
  /^(ECONNABORTED|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EAI_FAIL|EHOSTUNREACH|ENETUNREACH|EPIPE|ERR_TLS_[A-Z0-9_]{1,54}|ERR_SSL_[A-Z0-9_]{1,54}|CERT_[A-Z0-9_]{1,54}|UNABLE_TO_VERIFY_[A-Z0-9_]{1,54}|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|WRONGPASS|NOAUTH|NOPERM)$/;
const SAFE_ERROR_NAME = /^[A-Za-z][A-Za-z0-9]{0,63}$/;

type RedisConnectionFailureCategory =
  | 'tls-hostname-mismatch'
  | 'tls-protocol-or-port'
  | 'tls-handshake'
  | 'dns'
  | 'connection-refused'
  | 'timeout'
  | 'redis-authentication'
  | 'redis-acl'
  | 'connection-reset'
  | 'other';

/**
 * Produce a log-safe Redis connection diagnostic. Error messages and stacks
 * are intentionally omitted because client errors may contain connection URLs.
 */
export function describeRedisConnectionFailure(error: unknown): string {
  const errorName =
    error instanceof Error && SAFE_ERROR_NAME.test(error.name)
      ? error.name
      : 'Error';
  const rawCode =
    error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
  const normalizedCode =
    typeof rawCode === 'string' ? rawCode.toUpperCase() : undefined;
  const code =
    normalizedCode && SAFE_ERROR_CODE.test(normalizedCode)
      ? normalizedCode
      : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const category = classifyRedisConnectionFailure(code, errorName, message);
  const fields = [`category=${category}`];

  if (code) fields.push(`code=${code}`);
  fields.push(`type=${errorName}`);
  return fields.join(' ');
}

function classifyRedisConnectionFailure(
  code: string | undefined,
  errorName: string,
  message: string,
): RedisConnectionFailureCategory {
  if (code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
    return 'tls-hostname-mismatch';
  }
  if (code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
    return 'tls-protocol-or-port';
  }
  if (
    (code &&
      /^(ERR_TLS|ERR_SSL|CERT_|UNABLE_TO_VERIFY|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN)/.test(
        code,
      )) ||
    /certificate|self-signed|unable to verify|local issuer|tls|ssl/.test(
      message,
    )
  ) {
    return 'tls-handshake';
  }
  if (
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'EAI_FAIL' ||
    /getaddrinfo|dns lookup/.test(message)
  ) {
    return 'dns';
  }
  if (code === 'ECONNREFUSED' || /connection refused/.test(message)) {
    return 'connection-refused';
  }
  if (
    code === 'ETIMEDOUT' ||
    /timeout|timed out/.test(message) ||
    /timeout/i.test(errorName)
  ) {
    return 'timeout';
  }
  if (
    code === 'WRONGPASS' ||
    code === 'NOAUTH' ||
    /wrongpass|noauth|authentication required|invalid username-password/.test(
      message,
    )
  ) {
    return 'redis-authentication';
  }
  if (code === 'NOPERM' || /noperm|permission denied|acl/.test(message)) {
    return 'redis-acl';
  }
  if (
    code === 'ECONNRESET' ||
    /connection reset|socket closed unexpectedly/.test(message)
  ) {
    return 'connection-reset';
  }
  return 'other';
}
