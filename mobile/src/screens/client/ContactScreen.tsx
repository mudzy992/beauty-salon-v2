import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme';
import { fetchPublicSettings, type PublicSettingItem } from '../../services/publicSettings';
import { formatSalonWorkingHours } from '../../utils/formatSalonHours';
import api from '../../services/api';
import { usePublicContentSocketRefresh } from '../../hooks/usePublicContentSocketRefresh';
import { tryOpenExternalUrl, type ExternalLinkScheme } from '../../utils/externalLink';
import type { ProfileScreenProps } from '../../navigation/types';

function getSettingValue(
  settings: PublicSettingItem[] | null | undefined,
  key: string,
  fallback: string,
): string {
  const value = settings?.find((x) => x.key === key)?.value;
  return typeof value === 'string' ? value : fallback;
}

function SocialLink({
  label,
  url,
  icon,
  onOpen,
}: {
  label: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
  onOpen: (url: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => onOpen(url)}
      activeOpacity={0.75}
      style={[styles.socialChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={{ color: colors.text, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ContactScreen({ navigation }: ProfileScreenProps<'Contact'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PublicSettingItem[] | null>(null);
  const [workingHours, setWorkingHours] = useState('');
  const [settingsError, setSettingsError] = useState(false);
  const [workingHoursError, setWorkingHoursError] = useState(false);
  const [settingsRetrying, setSettingsRetrying] = useState(false);
  const [workingHoursRetrying, setWorkingHoursRetrying] = useState(false);
  const settingsRequestGeneration = useRef(0);
  const hoursRequestGeneration = useRef(0);

  const loadPublicSettings = useCallback(() => {
    const generation = ++settingsRequestGeneration.current;
    setSettingsError(false);
    setSettingsRetrying(true);
    fetchPublicSettings()
      .then((items) => {
        if (generation === settingsRequestGeneration.current) setSettings(items);
      })
      .catch(() => {
        if (generation === settingsRequestGeneration.current) setSettingsError(true);
      })
      .finally(() => {
        if (generation === settingsRequestGeneration.current) {
          setSettingsRetrying(false);
          setLoading(false);
        }
      });
  }, []);

  const loadWorkingHours = useCallback(() => {
    const generation = ++hoursRequestGeneration.current;
    setWorkingHoursError(false);
    setWorkingHoursRetrying(true);
    api
      .get<{ workingHours?: { dayOfWeek: number; isWorkingDay: boolean; openTime: string; closeTime: string }[] } | null>(
        '/api/salon',
      )
      .then((r) => {
        if (generation === hoursRequestGeneration.current) {
          setWorkingHours(formatSalonWorkingHours(r.data?.workingHours));
        }
      })
      .catch(() => {
        if (generation === hoursRequestGeneration.current) setWorkingHoursError(true);
      })
      .finally(() => {
        if (generation === hoursRequestGeneration.current) setWorkingHoursRetrying(false);
      });
  }, []);

  const loadSettings = useCallback(() => {
    loadPublicSettings();
    loadWorkingHours();
  }, [loadPublicSettings, loadWorkingHours]);

  useEffect(() => {
    navigation.setOptions({ title: t('profile.contact.title') });
  }, [navigation, t]);

  useEffect(() => {
    loadSettings();
    return () => {
      settingsRequestGeneration.current += 1;
      hoursRequestGeneration.current += 1;
    };
  }, [loadSettings]);

  usePublicContentSocketRefresh(loadSettings);

  const address = getSettingValue(settings, 'public_contact_address', '').trim();
  const phone = getSettingValue(settings, 'public_contact_phone', '').trim();
  const email = getSettingValue(settings, 'public_contact_email', '').trim();
  const latRaw = getSettingValue(settings, 'public_contact_lat', '').trim();
  const lngRaw = getSettingValue(settings, 'public_contact_lng', '').trim();

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) > 0.000001 &&
    Math.abs(lng) > 0.000001;

  const showLinkError = useCallback(() => {
    Alert.alert(t('common.error'), t('profile.contact.openLinkError'));
  }, [t]);

  const openExternal = useCallback(async (
    value: unknown,
    schemes: readonly ExternalLinkScheme[],
  ) => {
    if (!(await tryOpenExternalUrl(value, schemes, (url) => Linking.openURL(url)))) {
      showLinkError();
    }
  }, [showLinkError]);

  const openMaps = async () => {
    const label = address || 'Beauty salon';
    const query = encodeURIComponent(label);

    const nativeUrl = hasCoords
      ? Platform.OS === 'ios'
        ? `maps:0,0?q=${query}&ll=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${query})`
      : Platform.OS === 'ios'
        ? `maps:0,0?q=${query}`
        : `geo:0,0?q=${query}`;

    const webUrl = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    const nativeScheme: ExternalLinkScheme = Platform.OS === 'ios' ? 'maps' : 'geo';

    if (await tryOpenExternalUrl(nativeUrl, [nativeScheme], (url) => Linking.openURL(url))) return;
    if (await tryOpenExternalUrl(webUrl, ['https'], (url) => Linking.openURL(url))) return;
    showLinkError();
  };

  const socials = useMemo(() => {
    const facebook = getSettingValue(settings, 'public_social_facebook', '').trim();
    const instagram = getSettingValue(settings, 'public_social_instagram', '').trim();
    const tiktok = getSettingValue(settings, 'public_social_tiktok', '').trim();
    return { facebook, instagram, tiktok };
  }, [settings]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Kontakt</Text>

        {settingsError ? (
          <View style={styles.recoveryNotice}>
            <Text style={{ color: colors.error }}>{t('profile.contact.settingsLoadError')}</Text>
            <Button
              title={t('common.retry')}
              onPress={loadPublicSettings}
              loading={settingsRetrying}
              variant="outline"
              size="sm"
            />
          </View>
        ) : null}

        {address ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, flex: 1 }}>{address}</Text>
          </View>
        ) : null}

        {phone ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => void openExternal(`tel:${phone.replace(/\s/g, '')}`, ['tel'])}
            activeOpacity={0.75}
          >
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, flex: 1 }}>{phone}</Text>
          </TouchableOpacity>
        ) : null}

        {email ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => void openExternal(`mailto:${email}`, ['mailto'])}
            activeOpacity={0.75}
          >
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, flex: 1 }}>{email}</Text>
          </TouchableOpacity>
        ) : null}

        {workingHours ? (
          <View style={[styles.row, { alignItems: 'flex-start' }]}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 20 }}>
              {workingHours}
            </Text>
          </View>
        ) : null}

        {workingHoursError ? (
          <View style={styles.recoveryNotice}>
            <Text style={{ color: colors.error }}>{t('profile.contact.workingHoursLoadError')}</Text>
            <Button
              title={t('common.retry')}
              onPress={loadWorkingHours}
              loading={workingHoursRetrying}
              variant="outline"
              size="sm"
            />
          </View>
        ) : null}

        {address || hasCoords ? (
          <TouchableOpacity
            onPress={openMaps}
            activeOpacity={0.75}
            style={[styles.row, { marginTop: 4 }]}
          >
            <Ionicons name="navigate-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Navigacija (otvori u Maps)
            </Text>
          </TouchableOpacity>
        ) : null}
      </Card>

      {socials.facebook || socials.instagram || socials.tiktok ? (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Društvene mreže</Text>
          <View style={styles.socialRow}>
            {socials.facebook ? (
              <SocialLink label="Facebook" url={socials.facebook} icon="logo-facebook" onOpen={(url) => void openExternal(url, ['https', 'http'])} />
            ) : null}
            {socials.instagram ? (
              <SocialLink label="Instagram" url={socials.instagram} icon="logo-instagram" onOpen={(url) => void openExternal(url, ['https', 'http'])} />
            ) : null}
            {socials.tiktok ? (
              <SocialLink label="TikTok" url={socials.tiktok} icon="link-outline" onOpen={(url) => void openExternal(url, ['https', 'http'])} />
            ) : null}
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  recoveryNotice: { gap: spacing.xs, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
