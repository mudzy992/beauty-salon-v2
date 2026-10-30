import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as SecureStore from 'expo-secure-store';
import { getSalonDateOnly } from '../../../../shared/business-date.mjs';
import { base64ToBytes, Sha256 } from './sha256';
import {
  MAX_APK_SIZE_BYTES,
  MAX_RELEASE_METADATA_BYTES,
  parseLatestAndroidRelease,
  resolveApkAbsoluteUrl as resolveSafeApkAbsoluteUrl,
  type LatestAndroidRelease,
} from './release-payload';

export type { LatestAndroidRelease } from './release-payload';

export type UpdateDecision =
  | { kind: 'none' }
  | { kind: 'soft'; release: LatestAndroidRelease }
  | { kind: 'force'; release: LatestAndroidRelease };

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const SOFT_PROMPT_KEY = 'apk_update_soft_prompt_day';
const CHUNK = 1024 * 1024;

export const isAndroid = (): boolean => Platform.OS === 'android';

export const getLocalVersionCode = (): number => {
  const raw = Application.nativeBuildVersion;
  const n = Number.parseInt(String(raw ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
};

export const resolveApkAbsoluteUrl = (apkUrl: string): string =>
  resolveSafeApkAbsoluteUrl(apkUrl, API_URL);

export const fetchLatestAndroidRelease = async (): Promise<LatestAndroidRelease | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${API_URL}/api/public/app-releases/android/latest`, {
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`version_check_failed_${res.status}`);
    const contentLength = Number(res.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_RELEASE_METADATA_BYTES) {
      throw new Error('release_metadata_too_large');
    }
    const text = await res.text();
    if (text.length > MAX_RELEASE_METADATA_BYTES) throw new Error('release_metadata_too_large');
    const value: unknown = JSON.parse(text);
    if (value === null) return null;
    const release = parseLatestAndroidRelease(value);
    if (!release) throw new Error('invalid_release_metadata');
    return release;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const decideUpdate = (
  localVersionCode: number,
  release: LatestAndroidRelease,
): UpdateDecision => {
  if (release.versionCode <= localVersionCode) return { kind: 'none' };
  const force =
    release.forceUpdate || localVersionCode < release.minSupportedVersionCode;
  return force
    ? { kind: 'force', release }
    : { kind: 'soft', release };
};

export const wasSoftPromptShownToday = async (): Promise<boolean> => {
  const day = getSalonDateOnly();
  const stored = await SecureStore.getItemAsync(SOFT_PROMPT_KEY);
  return stored === day;
};

export const markSoftPromptShownToday = async (): Promise<void> => {
  const day = getSalonDateOnly();
  await SecureStore.setItemAsync(SOFT_PROMPT_KEY, day);
};

export const hashFileSha256 = async (fileUri: string): Promise<string> => {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || typeof info.size !== 'number' || info.size < 4) {
    throw new Error('apk_missing');
  }
  if (info.size > MAX_APK_SIZE_BYTES) throw new Error('apk_too_large');
  const hasher = new Sha256();
  let offset = 0;
  while (offset < info.size) {
    const length = Math.min(CHUNK, info.size - offset);
    const b64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: offset,
      length,
    });
    hasher.update(base64ToBytes(b64));
    offset += length;
  }
  return hasher.hex();
};

export type ApkInstallPhase = 'download' | 'verify' | 'install';

export const downloadAndInstallApk = async (
  release: LatestAndroidRelease,
  onProgress?: (ratio: number) => void,
  onPhase?: (phase: ApkInstallPhase) => void,
): Promise<void> => {
  if (!isAndroid()) throw new Error('android_only');
  const safeRelease = parseLatestAndroidRelease(release);
  if (!safeRelease) throw new Error('invalid_release_metadata');
  onPhase?.('download');
  const url = resolveApkAbsoluteUrl(safeRelease.apkUrl);
  const target = `${FileSystem.cacheDirectory}app-update-${safeRelease.versionCode}.apk`;
  let exceededLimit = false;
  let download: ReturnType<typeof FileSystem.createDownloadResumable>;
  download = FileSystem.createDownloadResumable(
    url,
    target,
    {},
    (p) => {
      if (
        p.totalBytesWritten > MAX_APK_SIZE_BYTES ||
        p.totalBytesExpectedToWrite > MAX_APK_SIZE_BYTES
      ) {
        exceededLimit = true;
        void download.pauseAsync().catch(() => undefined);
        return;
      }
      if (!onProgress || !p.totalBytesExpectedToWrite) return;
      onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    },
  );
  let result: Awaited<ReturnType<typeof download.downloadAsync>>;
  try {
    result = await download.downloadAsync();
    if (exceededLimit) throw new Error('apk_too_large');
    if (!result?.uri) throw new Error('download_failed');
    const downloadedInfo = await FileSystem.getInfoAsync(result.uri);
    if (
      !downloadedInfo.exists || typeof downloadedInfo.size !== 'number' ||
      downloadedInfo.size !== safeRelease.apkSizeBytes ||
      downloadedInfo.size > MAX_APK_SIZE_BYTES
    ) throw new Error('apk_size_mismatch');
  } catch (error) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
    throw error;
  }
  onProgress?.(1);
  onPhase?.('verify');
  const sha = await hashFileSha256(result.uri);
  if (sha !== safeRelease.apkSha256) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error('sha256_mismatch');
  }
  onPhase?.('install');
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
};
