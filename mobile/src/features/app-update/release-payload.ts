export const MAX_APK_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_RELEASE_METADATA_BYTES = 16 * 1024;

export interface LatestAndroidRelease {
  version: string;
  versionCode: number;
  minSupportedVersionCode: number;
  forceUpdate: boolean;
  apkUrl: string;
  apkSha256: string;
  apkSizeBytes: number;
  releaseNotes: string | null;
  publishedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeApkPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 512 || value.includes('\\')) return false;
  try {
    const parsed = new URL(value, 'https://api.invalid');
    return (
      parsed.origin === 'https://api.invalid' &&
      !parsed.username && !parsed.password &&
      !parsed.search && !parsed.hash &&
      /^\/uploads\/app-releases\/\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.apk$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function parseLatestAndroidRelease(value: unknown): LatestAndroidRelease | null {
  if (!isRecord(value)) return null;
  const {
    version,
    versionCode,
    minSupportedVersionCode,
    forceUpdate,
    apkUrl,
    apkSha256,
    apkSizeBytes,
    releaseNotes,
    publishedAt,
  } = value;

  if (
    typeof version !== 'string' || !version.trim() || version.length > 64 ||
    !Number.isSafeInteger(versionCode) || (versionCode as number) < 1 ||
    !Number.isSafeInteger(minSupportedVersionCode) || (minSupportedVersionCode as number) < 0 ||
    (minSupportedVersionCode as number) > (versionCode as number) ||
    typeof forceUpdate !== 'boolean' ||
    !isSafeApkPath(apkUrl) ||
    typeof apkSha256 !== 'string' || !/^[a-f\d]{64}$/i.test(apkSha256) ||
    !Number.isSafeInteger(apkSizeBytes) ||
    (apkSizeBytes as number) < 4 || (apkSizeBytes as number) > MAX_APK_SIZE_BYTES ||
    !(releaseNotes === null || typeof releaseNotes === 'string') ||
    (typeof releaseNotes === 'string' && releaseNotes.length > 12_000) ||
    !(publishedAt === null || (
      typeof publishedAt === 'string' && publishedAt.length <= 64 && !Number.isNaN(Date.parse(publishedAt))
    ))
  ) return null;

  return {
    version: version.trim(),
    versionCode: versionCode as number,
    minSupportedVersionCode: minSupportedVersionCode as number,
    forceUpdate,
    apkUrl,
    apkSha256: apkSha256.toLowerCase(),
    apkSizeBytes: apkSizeBytes as number,
    releaseNotes: releaseNotes as string | null,
    publishedAt: publishedAt as string | null,
  };
}

export function resolveApkAbsoluteUrl(apkUrl: string, apiUrl: string): string {
  const base = new URL(apiUrl);
  let parsed: URL;
  try {
    parsed = new URL(apkUrl, base);
  } catch {
    throw new Error('invalid_apk_url');
  }
  if (
    parsed.origin !== base.origin ||
    parsed.username || parsed.password ||
    parsed.search || parsed.hash ||
    !isSafeApkPath(parsed.pathname)
  ) throw new Error('invalid_apk_url');
  return parsed.toString();
}
