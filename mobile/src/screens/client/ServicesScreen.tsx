import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import api, { getImageUrl } from '../../services/api';
import {
  fetchAllPublicServiceCategories,
  fetchAllPublicServices,
} from '../../services/catalog';
import { MediaImage } from '../../components/MediaImage';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '../../theme';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import type { ServicesScreenProps } from '../../navigation/types';
import type { Reservation, Service, ServiceCategory } from '../../types';
import {
  normalizePublicServiceCategories,
  normalizePublicServices,
  normalizeReservations,
} from '../../utils/apiPayload';

type PopularService = Service & { reservationsCount: number };

export function ServicesScreen({ navigation }: ServicesScreenProps<'Services'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [popularService, setPopularService] = useState<PopularService | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [categoriesRes, servicesRes, reservationsRes, popularRes] = await Promise.all([
        fetchAllPublicServiceCategories<unknown>({ activeOnly: true }),
        fetchAllPublicServices<unknown>({ activeOnly: true }),
        api.get<Reservation[]>('/api/reservations', { params: { asClient: true } }).catch(() => null),
        api.get<PopularService | null>('/api/services/popular').catch(() => null),
      ]);
      const normalizedCategoryData = normalizePublicServiceCategories(categoriesRes);
      const normalizedServiceData = normalizePublicServices(servicesRes);
      if (!normalizedCategoryData || !normalizedServiceData) {
        throw new Error('Invalid public service catalogue payload');
      }
      setCategories(normalizedCategoryData);
      setServices(normalizedServiceData);
      setReservations(normalizeReservations(reservationsRes?.data) ?? []);
      setPopularService(popularRes?.data ?? null);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useReservationSocketRefresh(fetchData);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const normalizedCategories = categories
    .filter((c) => {
      const n = c.name.toLowerCase();
      return n.includes('muš') || n.includes('zen') || n.includes('žen');
    })
    .slice(0, 2);

  const featuredService = popularService ?? services[0] ?? null;
  const lastUsedService = (() => {
    const completed = reservations
      .filter((r) => r.status === 'COMPLETED' && r.service)
      .sort((a, b) => {
        const ad = new Date(a.completedAt || a.reservationDate).getTime();
        const bd = new Date(b.completedAt || b.reservationDate).getTime();
        return bd - ad;
      });
    return completed[0]?.service;
  })();

  const openCategory = (category: ServiceCategory) =>
    navigation.navigate('ServiceDetail', {
      categoryId: category.id,
      categoryName: category.name,
    });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingBottom: spacing.lg + tabBarBottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.list}>
        {loadError && categories.length > 0 ? (
          <Card style={[styles.errorCard, { borderColor: colors.border }]}>
            <View style={styles.errorCopy}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>{t('services.loadErrorTitle')}</Text>
              <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
                {t('services.staleMessage')}
              </Text>
            </View>
            <Button title={t('common.retry')} onPress={() => void fetchData()} variant="outline" size="sm" />
          </Card>
        ) : null}
        {normalizedCategories.length === 0 ? (
          loadError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('services.loadErrorTitle')}
              message={t('services.loadErrorMessage')}
              actionLabel={t('common.retry')}
              onAction={() => void fetchData()}
            />
          ) : <EmptyState icon="cut-outline" title={t('services.noServices')} />
        ) : (
          <>
            <View style={styles.heroCardWrap}>
              <Card style={styles.heroCard}>
                <View style={styles.heroWatermark} pointerEvents="none">
                  <Ionicons name="diamond-outline" size={54} color={colors.primary} style={styles.heroWatermarkMain} />
                  <Ionicons name="sparkles-outline" size={24} color={colors.primary} style={styles.heroWatermarkAccent} />
                </View>
                <Text style={[styles.heroOverline, { color: colors.textSecondary }]}>PREMIUM KOLEKCIJA</Text>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Odaberi idealnu uslugu</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  Muškarci i žene kategorije su brzo dostupne ispod, uz preporuke po tvojoj historiji.
                </Text>
              </Card>
            </View>

            {featuredService ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Najpopularniji servis</Text>
                </View>
                <Card
                  style={styles.featuredCard}
                  onPress={() =>
                    navigation.navigate('ServiceSingleDetail', {
                      serviceId: featuredService.id,
                      serviceName: featuredService.name,
                    })
                  }
                >
                  <MediaImage
                    uri={featuredService.heroImage ? getImageUrl(featuredService.heroImage) : undefined}
                    style={styles.featuredImage}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.5)']}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  <View style={styles.featuredLabel}>
                    <Text style={styles.featuredName}>{featuredService.name}</Text>
                    <Text style={styles.featuredMeta}>
                      {featuredService.durationMinutes} min
                      {popularService?.reservationsCount
                        ? `  ·  ${popularService.reservationsCount} rezervacija`
                        : ''}
                    </Text>
                  </View>
                </Card>
              </View>
            ) : null}

            {lastUsedService ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Tvoj zadnji servis</Text>
                </View>
                <Card
                  style={styles.lastUsedCard}
                  onPress={() =>
                    navigation.navigate('ServiceSingleDetail', {
                      serviceId: lastUsedService.id,
                      serviceName: lastUsedService.name,
                    })
                  }
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
                    <Ionicons name="time-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{lastUsedService.name}</Text>
                    <Text style={[styles.categoryDesc, { color: colors.textSecondary }]}>
                      Rezerviši ponovo u samo jednom koraku.
                    </Text>
                  </View>
                  <Button
                    title="Ponovi"
                    size="sm"
                    onPress={() =>
                      navigation.navigate('ServiceSingleDetail', {
                        serviceId: lastUsedService.id,
                        serviceName: lastUsedService.name,
                      })
                    }
                  />
                </Card>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Kategorije</Text>
              </View>
              <View style={styles.categoriesRow}>
                {normalizedCategories.map((item, index) => (
                    <Card key={item.id} style={[styles.categoryCard, styles.categoryTile]} onPress={() => openCategory(item)}>
                      <LinearGradient
                        colors={
                          index === 0
                            ? ['rgba(97,164,255,0.12)', 'rgba(97,164,255,0.04)']
                            : ['rgba(255,138,194,0.12)', 'rgba(255,138,194,0.04)']
                        }
                        style={[
                          StyleSheet.absoluteFill,
                          {
                            borderRadius: borderRadius.lg,
                            borderCurve: 'continuous',
                          },
                        ]}
                        pointerEvents="none"
                      />
                      <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
                        <Ionicons name={index === 0 ? 'male-outline' : 'female-outline'} size={24} color={colors.primary} />
                      </View>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.categoryDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.description || 'Pogledaj dostupne usluge i rezerviši termin.'}
                      </Text>
                    </Card>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  section: { marginTop: spacing.sm },
  heroCardWrap: { marginBottom: spacing.sm },
  errorCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorCopy: { flex: 1, gap: spacing.xs },
  errorTitle: { fontSize: 14, fontWeight: '700' },
  errorMessage: { fontSize: 12, lineHeight: 17 },
  heroCard: { overflow: 'hidden', padding: spacing.md, position: 'relative' },
  heroWatermark: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
    width: 76,
    height: 76,
    opacity: 0.11,
  },
  heroWatermarkMain: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroWatermarkAccent: {
    position: 'absolute',
    right: 36,
    top: 38,
  },
  heroOverline: { fontSize: 11, letterSpacing: 0.9, marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  heroSubtitle: { fontSize: 14, lineHeight: 20 },
  featuredCard: { overflow: 'hidden', height: 188, borderRadius: borderRadius.xl, padding: 0 },
  featuredImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  featuredLabel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  featuredName: { color: '#fff', fontSize: 19, fontWeight: '700' },
  featuredMeta: { color: 'rgba(255,255,255,0.95)', marginTop: 2, fontSize: 13 },
  lastUsedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoriesRow: { flexDirection: 'row', gap: spacing.sm },
  categoryTile: { flex: 1 },
  categoryCard: { minHeight: 170, overflow: 'hidden' },
  sectionHeader: { marginBottom: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardText: { flex: 1 },
  categoryName: { fontSize: 17, fontWeight: '600' },
  categoryDesc: { fontSize: 13, marginTop: 2 },
});
