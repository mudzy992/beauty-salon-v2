import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as SecureStore from 'expo-secure-store';
import { base64ToBytes, Sha256 } from './sha256';

export type LatestAndroidRelease = {
  version: string;
  versionCode: number;
  minSupportedVersionCode: number;
  forceUpdate: boolean;
  apkUrl: string;
  apkSha256: string;
  apkSizeBytes: number;
  releaseNotes: string | null;
  publishedAt: string | null;
};

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

export const resolveApkAbsoluteUrl = (apkUrl: string): string => {
  if (/^https?:\/\//i.test(apkUrl)) return apkUrl;
  return `${API_URL}${apkUrl.startsWith('/') ? '' : '/'}${apkUrl}`;
};

export const fetchLatestAndroidRelease = async (): Promise<LatestAndroidRelease | null> => {
  const res = await fetch(`${API_URL}/api/public/app-releases/android/latest`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`version_check_failed_${res.status}`);
  return (await res.json()) as LatestAndroidRelease;
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
  const day = new Date().toISOString().slice(0, 10);
  const stored = await SecureStore.getItemAsync(SOFT_PROMPT_KEY);
  return stored === day;
};

export const markSoftPromptShownToday = async (): Promise<void> => {
  const day = new Date().toISOString().slice(0, 10);
  await SecureStore.setItemAsync(SOFT_PROMPT_KEY, day);
};

export const hashFileSha256 = async (fileUri: string): Promise<string> => {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || typeof info.size !== 'number') {
    throw new Error('apk_missing');
  }
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

export const downloadAndInstallApk = async (
  release: LatestAndroidRelease,
  onProgress?: (ratio: number) => void,
): Promise<void> => {
  if (!isAndroid()) throw new Error('android_only');
  const url = resolveApkAbsoluteUrl(release.apkUrl);
  const target = `${FileSystem.cacheDirectory}app-update-${release.versionCode}.apk`;
  const download = FileSystem.createDownloadResumable(
    url,
    target,
    {},
    (p) => {
      if (!onProgress || !p.totalBytesExpectedToWrite) return;
      onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    },
  );
  const result = await download.downloadAsync();
  if (!result?.uri) throw new Error('download_failed');
  const sha = await hashFileSha256(result.uri);
  if (sha.toLowerCase() !== release.apkSha256.toLowerCase()) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error('sha256_mismatch');
  }
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
};
