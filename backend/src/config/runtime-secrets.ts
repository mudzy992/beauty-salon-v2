const MIN_JWT_SECRET_BYTES = 32
const SETTINGS_ENCRYPTION_KEY_BYTES = 32

/**
 * Validate secrets before Nest creates providers that sign JWTs or encrypt settings.
 * Error messages intentionally never include secret values.
 */
export function validateRuntimeSecrets<T extends Record<string, unknown>>(
  config: T,
): T {
  const jwtSecret = config.JWT_SECRET
  if (
    typeof jwtSecret !== 'string' ||
    jwtSecret.trim() !== jwtSecret ||
    jwtSecret.toLowerCase().startsWith('replace_') ||
    jwtSecret === 'change-me-in-production' ||
    Buffer.byteLength(jwtSecret, 'utf8') < MIN_JWT_SECRET_BYTES
  ) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes.')
  }

  const encryptionKey = config.APP_SETTINGS_ENCRYPTION_KEY
  if (typeof encryptionKey !== 'string' || !isCanonical32ByteBase64(encryptionKey)) {
    throw new Error(
      'APP_SETTINGS_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes.',
    )
  }

  return config
}

function isCanonical32ByteBase64(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64')
    return (
      decoded.length === SETTINGS_ENCRYPTION_KEY_BYTES &&
      decoded.toString('base64') === value
    )
  } catch {
    return false
  }
}
