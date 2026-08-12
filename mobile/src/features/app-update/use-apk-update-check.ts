import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { downloadAndInstallApk, type LatestAndroidRelease } from './apk-update';
import { runApkUpdateCheck } from './run-apk-update-check';

export type ApkUpdateUiState = {
  forceRelease: LatestAndroidRelease | null;
  downloading: boolean;
  progress: number;
  error: string | null;
  startDownload: (release: LatestAndroidRelease) => Promise<void>;
  checkNow: (opts?: { manual?: boolean }) => Promise<void>;
};

export const useApkUpdateCheck = (opts?: { auto?: boolean }): ApkUpdateUiState => {
  const { t } = useTranslation();
  const auto = opts?.auto !== false;
  const [forceRelease, setForceRelease] = useState<LatestAndroidRelease | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const startDownload = useCallback(
    async (release: LatestAndroidRelease) => {
      setDownloading(true);
      setProgress(0);
      setError(null);
      try {
        await downloadAndInstallApk(release, setProgress);
      } catch {
        const message = t('appUpdate.downloadError');
        setError(message);
        Alert.alert(t('appUpdate.title'), message);
      } finally {
        setDownloading(false);
      }
    },
    [t],
  );

  const checkNow = useCallback(
    async (checkOpts?: { manual?: boolean }) => {
      await runApkUpdateCheck({
        manual: checkOpts?.manual === true,
        t: t as (key: string, o?: Record<string, unknown>) => string,
        onForce: setForceRelease,
        onDownload: (release) => {
          void startDownload(release);
        },
      });
    },
    [startDownload, t],
  );

  useEffect(() => {
    if (!auto) return;
    if (startedRef.current) return;
    startedRef.current = true;
    void checkNow({ manual: false });
  }, [auto, checkNow]);

  return {
    forceRelease,
    downloading,
    progress,
    error,
    startDownload,
    checkNow,
  };
};
