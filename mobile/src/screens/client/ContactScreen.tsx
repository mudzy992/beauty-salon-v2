import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';
import { fetchPublicSettings, type PublicSettingItem } from '../../services/publicSettings';
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
}: {
  label: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url)}
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

  useEffect(() => {
    navigation.setOptions({ title: t('profile.contact.title') });
  }, [navigation, t]);

  useEffect(() => {
    fetchPublicSettings()
      .then((items) => setSettings(items))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const address = getSettingValue(settings, 'public_contact_address', '').trim();
  const phone = getSettingValue(settings, 'public_contact_phone', '').trim();
  const email = getSettingValue(settings, 'public_contact_email', '').trim();
  const workingHours = getSettingValue(settings, 'public_contact_working_hours_text', '').trim();

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

        {address ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, flex: 1 }}>{address}</Text>
          </View>
        ) : null}

        {phone ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL(`tel:${phone}`)}
            activeOpacity={0.75}
          >
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, flex: 1 }}>{phone}</Text>
          </TouchableOpacity>
        ) : null}

        {email ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL(`mailto:${email}`)}
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
      </Card>

      {socials.facebook || socials.instagram || socials.tiktok ? (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Društvene mreže</Text>
          <View style={styles.socialRow}>
            {socials.facebook ? (
              <SocialLink label="Facebook" url={socials.facebook} icon="logo-facebook" />
            ) : null}
            {socials.instagram ? (
              <SocialLink label="Instagram" url={socials.instagram} icon="logo-instagram" />
            ) : null}
            {socials.tiktok ? (
              <SocialLink label="TikTok" url={socials.tiktok} icon="link-outline" />
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
