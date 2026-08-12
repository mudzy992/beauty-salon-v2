import { Alert } from 'react-native';
import type { TFunction } from 'i18next';
import {
  decideUpdate,
  downloadAndInstallApk,
  fetchLatestAndroidRelease,
  getLocalVersionCode,
  isAndroid,
} from './apk-update';

export const runManualApkUpdateCheck = async (t: TFunction): Promise<void> => {
  if (!isAndroid()) {
    Alert.alert(t('appUpdate.title'), t('appUpdate.androidOnly'));
    return;
  }
  try {
    const latest = await fetchLatestAndroidRelease();
    if (!latest) {
      Alert.alert(t('appUpdate.title'), t('appUpdate.upToDate'));
      return;
    }
    const decision = decideUpdate(getLocalVersionCode(), latest);
    if (decision.kind === 'none') {
      Alert.alert(t('appUpdate.title'), t('appUpdate.upToDate'));
      return;
    }
    Alert.alert(
      decision.kind === 'force' ? t('appUpdate.forceTitle') : t('appUpdate.title'),
      `${t('appUpdate.available', { version: decision.release.version })}\n\n${
        decision.release.releaseNotes ?? ''
      }`.trim(),
      [
        ...(decision.kind === 'force'
          ? []
          : [{ text: t('appUpdate.later'), style: 'cancel' as const }]),
        {
          text: t('appUpdate.update'),
          onPress: () => {
            void downloadAndInstallApk(decision.release).catch(() => {
              Alert.alert(t('appUpdate.title'), t('appUpdate.downloadError'));
            });
          },
        },
      ],
    );
  } catch {
    Alert.alert(t('appUpdate.title'), t('appUpdate.checkError'));
  }
};
