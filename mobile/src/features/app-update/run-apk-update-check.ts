import { Alert } from 'react-native';
import {
  decideUpdate,
  downloadAndInstallApk,
  fetchLatestAndroidRelease,
  getLocalVersionCode,
  isAndroid,
  markSoftPromptShownToday,
  wasSoftPromptShownToday,
  type LatestAndroidRelease,
} from './apk-update';

type Translate = (key: string, opts?: Record<string, unknown>) => string;

type Options = {
  manual?: boolean;
  t: Translate;
  onForce?: (release: LatestAndroidRelease) => void;
  onDownload?: (release: LatestAndroidRelease) => void;
};

export const runApkUpdateCheck = async ({
  manual = false,
  t,
  onForce,
  onDownload,
}: Options): Promise<void> => {
  if (!isAndroid()) {
    if (manual) Alert.alert(t('appUpdate.title'), t('appUpdate.androidOnly'));
    return;
  }
  try {
    const latest = await fetchLatestAndroidRelease();
    if (!latest) {
      if (manual) Alert.alert(t('appUpdate.title'), t('appUpdate.upToDate'));
      return;
    }
    const decision = decideUpdate(getLocalVersionCode(), latest);
    if (decision.kind === 'none') {
      if (manual) Alert.alert(t('appUpdate.title'), t('appUpdate.upToDate'));
      return;
    }
    if (decision.kind === 'force') {
      onForce?.(decision.release);
      return;
    }
    if (!manual && (await wasSoftPromptShownToday())) return;
    if (!manual) await markSoftPromptShownToday();
    Alert.alert(
      t('appUpdate.title'),
      `${t('appUpdate.available', { version: decision.release.version })}\n\n${
        decision.release.releaseNotes ?? ''
      }`.trim(),
      [
        { text: t('appUpdate.later'), style: 'cancel' },
        {
          text: t('appUpdate.update'),
          onPress: () => {
            if (onDownload) onDownload(decision.release);
            else void downloadAndInstallApk(decision.release);
          },
        },
      ],
    );
  } catch {
    if (manual) Alert.alert(t('appUpdate.title'), t('appUpdate.checkError'));
  }
};
