export interface CorsRuntimeConfig {
  allowedOrigins: string[];
}

const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
] as const;

export function resolveCorsRuntimeConfig(
  env: NodeJS.ProcessEnv,
): CorsRuntimeConfig {
  const environment = env.NODE_ENV?.trim().toLowerCase() || 'development';
  const requiresExplicitOrigins =
    !['development', 'test'].includes(environment);
  const raw = env.CORS_ALLOWED_ORIGINS?.trim();

  if (!raw) {
    if (requiresExplicitOrigins) {
      throw new Error(
        'CORS_ALLOWED_ORIGINS must be configured outside development and test.',
      );
    }
    return { allowedOrigins: [...DEVELOPMENT_ORIGINS] };
  }

  const configured = raw.split(',').map((origin) => origin.trim());
  if (configured.some((origin) => !origin) || configured.length > 100) {
    throw new Error('CORS_ALLOWED_ORIGINS contains an invalid origin list.');
  }

  const allowedOrigins = new Set<string>();
  for (const origin of configured) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('CORS_ALLOWED_ORIGINS contains an invalid origin.');
    }

    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.origin !== origin ||
      parsed.hostname.includes('*') ||
      parsed.username ||
      parsed.password ||
      (requiresExplicitOrigins && parsed.protocol !== 'https:')
    ) {
      throw new Error(
        requiresExplicitOrigins
          ? 'CORS_ALLOWED_ORIGINS must contain exact HTTPS origins only.'
          : 'CORS_ALLOWED_ORIGINS must contain exact HTTP(S) origins only.',
      );
    }
    allowedOrigins.add(parsed.origin);
  }

  return { allowedOrigins: [...allowedOrigins] };
}
