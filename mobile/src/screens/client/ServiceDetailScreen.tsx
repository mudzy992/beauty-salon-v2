import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { MediaBackdrop } from '../../components/MediaImage';
import { Button } from '../../components/ui/Button';
import api, { getUploadUrl } from '../../services/api';
import { spacing } from '../../theme';
import type { ServicesScreenProps } from '../../navigation/types';
import type { ServiceCategory, ServiceSubcategory, Service } from '../../types';

interface Section {
  title: string;
  data: Service[];
}

export function ServiceDetailScreen({ route, navigation }: ServicesScreenProps<'ServiceDetail'>) {
  const { categoryId, categoryName } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: categoryName });
  }, [navigation, categoryName]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<ServiceCategory>(`/api/services/categories/${categoryId}`);
        const sectionData: Section[] = (data.subcategories || [])
          .filter((sub) => sub.services && sub.services.length > 0)
          .map((sub) => ({
            title: sub.name,
            data: sub.services!,
          }));
        setSections(sectionData);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [categoryId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, { paddingBottom: spacing.md + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      renderSectionHeader={({ section: { title } }) => (
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
      )}
      renderItem={({ item, index }) => {
        const heroUri = item.heroImage ? getUploadUrl(item.heroImage) : null;
        const canBook = !user?.gender || item.gender === user.gender;
        return (
          <Animated.View entering={FadeInRight.delay(Math.min(index, 8) * 45).duration(320).springify()}>
          <Card style={{ ...styles.card, ...styles.cardBackdrop }}>
              <MediaBackdrop
                uri={heroUri}
                style={styles.cardBackdropImage}
                imageStyle={styles.cardBackdropImageStyle}
              >
                <View style={[styles.cardBackdropOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                <View style={styles.serviceRow}>
                  <TouchableOpacity
                    style={styles.serviceInfo}
                    onPress={() =>
                      navigation.navigate('ServiceSingleDetail', {
                        serviceId: item.id,
                        serviceName: item.name,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.serviceName, styles.serviceNameOverlay]}>
                      {item.name}
                    </Text>
                    {item.shortDescription && (
                      <Text
                        style={[styles.serviceDesc, styles.serviceDescOverlay]}
                        numberOfLines={2}
                      >
                        {item.shortDescription}
                      </Text>
                    )}
                    <View style={styles.meta}>
                      <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.95)" />
                      <Text style={styles.metaTextOverlay}>
                        {item.durationMinutes} min
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {canBook ? (
                    <Button
                      title={t('services.bookService')}
                      onPress={() =>
                        navigation.navigate('Reservation', {
                          serviceId: item.id,
                          serviceName: item.name,
                          origin: 'service-detail',
                          originCategoryId: categoryId,
                          originCategoryName: categoryName,
                        })
                      }
                      size="sm"
                      variant="outline"
                    />
                  ) : null}
                </View>
              </MediaBackdrop>
          </Card>
          </Animated.View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  card: { marginBottom: spacing.sm },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceInfo: { flex: 1, marginRight: spacing.md },
  serviceName: { fontSize: 16, fontWeight: '600' },
  serviceDesc: { fontSize: 13, marginTop: 2 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  cardBackdrop: { overflow: 'hidden', padding: 0 },
  cardBackdropImage: { minHeight: 100, padding: spacing.md, justifyContent: 'flex-end' },
  cardBackdropImageStyle: { borderRadius: 16, borderCurve: 'continuous' },
  cardBackdropOverlay: { ...StyleSheet.absoluteFill, borderRadius: 16, borderCurve: 'continuous' },
  cardBackdropPlaceholder: { padding: spacing.md, borderRadius: 16, borderCurve: 'continuous' },
  serviceNameOverlay: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  serviceDescOverlay: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  metaTextOverlay: { fontSize: 13, color: 'rgba(255,255,255,0.95)' },
});
