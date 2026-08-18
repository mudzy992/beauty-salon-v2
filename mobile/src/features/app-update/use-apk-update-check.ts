import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  downloadAndInstallApk,
  type ApkInstallPhase,
  type LatestAndroidRelease,
} from './apk-update';
import { runApkUpdateCheck } from './run-apk-update-check';

export type ApkUpdateUiState = {
  release: LatestAndroidRelease | null;
  isForce: boolean;
  downloading: boolean;
  progress: number;
  phase: ApkInstallPhase | 'idle';
  error: string | null;
  startDownload: (release: LatestAndroidRelease) => Promise<void>;
  dismissSoft: () => void;
  checkNow: (opts?: { manual?: boolean }) => Promise<void>;
};

export const useApkUpdateCheck = (opts?: { auto?: boolean }): ApkUpdateUiState => {
  const { t } = useTranslation();
  const auto = opts?.auto !== false;
  const [release, setRelease] = useState<LatestAndroidRelease | null>(null);
  const [isForce, setIsForce] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<ApkInstallPhase | 'idle'>('idle');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const startDownload = useCallback(
    async (next: LatestAndroidRelease) => {
      setRelease(next);
      setDownloading(true);
      setProgress(0);
      setPhase('download');
      setError(null);
      try {
        await downloadAndInstallApk(next, setProgress, setPhase);
      } catch {
        const message = t('appUpdate.downloadError');
        setError(message);
        Alert.alert(t('appUpdate.title'), message);
      } finally {
        setDownloading(false);
        setPhase('idle');
      }
    },
    [t],
  );

  const dismissSoft = useCallback(() => {
    if (isForce || downloading) return;
    setRelease(null);
    setError(null);
    setPhase('idle');
  }, [downloading, isForce]);

  const checkNow = useCallback(
    async (checkOpts?: { manual?: boolean }) => {
      await runApkUpdateCheck({
        manual: checkOpts?.manual === true,
        t: t as (key: string, o?: Record<string, unknown>) => string,
        onForce: (next) => {
          setIsForce(true);
          setRelease(next);
        },
        onSoft: (next) => {
          setIsForce(false);
          setRelease(next);
        },
      });
    },
    [t],
  );

  useEffect(() => {
    if (!auto) return;
    if (startedRef.current) return;
    startedRef.current = true;
    void checkNow({ manual: false });
  }, [auto, checkNow]);

  return {
    release,
    isForce,
    downloading,
    progress,
    phase,
    error,
    startDownload,
    dismissSoft,
    checkNow,
  };
};
