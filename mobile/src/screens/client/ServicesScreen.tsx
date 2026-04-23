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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import api, { getImageUrl } from '../../services/api';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '../../theme';
import type { ServicesScreenProps } from '../../navigation/types';
import type { Reservation, Service, ServiceCategory } from '../../types';

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

  const fetchData = useCallback(async () => {
    try {
      const [categoriesRes, servicesRes, reservationsRes, popularRes] = await Promise.all([
        api.get<ServiceCategory[]>('/api/services/categories', { params: { activeOnly: true } }),
        api.get<Service[]>('/api/services', { params: { activeOnly: true } }),
        api.get<Reservation[]>('/api/reservations', { params: { asClient: true } }).catch(() => null),
        api.get<PopularService | null>('/api/services/popular').catch(() => null),
      ]);
      setCategories(categoriesRes.data);
      setServices(servicesRes.data);
      setReservations(reservationsRes?.data ?? []);
      setPopularService(popularRes?.data ?? null);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        {normalizedCategories.length === 0 ? (
          <EmptyState icon="cut-outline" title={t('services.noServices')} />
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(340).springify()} style={styles.heroCardWrap}>
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
            </Animated.View>

            {featuredService ? (
              <Animated.View entering={FadeInDown.delay(50).duration(340).springify()} style={styles.section}>
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
                  <Image
                    source={{ uri: featuredService.heroImage ? getImageUrl(featuredService.heroImage) : undefined }}
                    style={styles.featuredImage}
                    contentFit="cover"
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
              </Animated.View>
            ) : null}

            {lastUsedService ? (
              <Animated.View entering={FadeInDown.delay(80).duration(340).springify()} style={styles.section}>
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
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(120).duration(340).springify()} style={styles.section}>
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
            </Animated.View>
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
  featuredImage: { ...StyleSheet.absoluteFillObject },
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
