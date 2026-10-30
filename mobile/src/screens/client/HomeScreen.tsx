import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Pressable,
  Linking,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaImage } from '../../components/MediaImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { usePublicContentSocketRefresh } from '../../hooks/usePublicContentSocketRefresh';
import { useSocket } from '../../realtime/SocketContext';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { getImageUrl, getUploadUrl } from '../../services/api';
import { fetchPublicSettings } from '../../services/publicSettings';
import {
  fetchAllPublicServiceCategories,
  fetchAllPublicServices,
} from '../../services/catalog';
import { spacing, borderRadius } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import type { HomeScreenProps } from '../../navigation/types';
import type { Service, BlogPost, ServiceCategory, Reservation, ReservationStatus } from '../../types';
import { formatDateOnlyLocale, formatInstantDateLocale, isUpcoming } from '../../utils/date';

interface BeforeAfterPair {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

const HERO_HEIGHT = 220;
function resolveHeroImageUrl(value: string): string {
  if (!value?.trim()) return '';
  const v = value.trim();
  if (v.startsWith('http')) return v;
  return getImageUrl(v) || '';
}

function resolveBlogImageUrl(value?: string | null): string {
  if (!value?.trim()) return '';
  const v = value.trim();
  if (v.startsWith('http')) return v;
  return getImageUrl(v) || '';
}

interface CategoryWithServices {
  category: ServiceCategory;
  services: Service[];
}

interface PublicSetting {
  key: string;
  value: string;
}

function isPublicSetting(value: unknown): value is PublicSetting {
  if (!value || typeof value !== 'object') return false;
  const setting = value as Record<string, unknown>;
  return typeof setting.key === 'string' && typeof setting.value === 'string';
}

function normalizeSettings(input: unknown): PublicSetting[] {
  if (Array.isArray(input)) return input.filter(isPublicSetting);
  if (input && typeof input === 'object') {
    const payload = input as { items?: unknown; settings?: unknown };
    if (Array.isArray(payload.items)) return payload.items.filter(isPublicSetting);
    if (Array.isArray(payload.settings)) return payload.settings.filter(isPublicSetting);
  }
  return [];
}

function getSettingValue(settings: PublicSetting[] | null | undefined, key: string, fallback: string): string {
  if (!Array.isArray(settings)) return fallback;
  const item = settings.find((s) => s.key === key);
  return item?.value?.trim() || fallback;
}

function formatBlogDate(value?: string | null): string {
  if (!value) return '';
  return formatInstantDateLocale(value, 'bs-BA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatReservationDate(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  const cleanDateStr = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  try {
    const datePart = formatDateOnlyLocale(cleanDateStr, 'bs-BA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const formattedDate = datePart.charAt(0).toUpperCase() + datePart.slice(1);
    return `${formattedDate} u ${timeStr.slice(0, 5)}`;
  } catch {
    return `${cleanDateStr} u ${timeStr.slice(0, 5)}`;
  }
}

function getStatusLabel(status: ReservationStatus): string {
  const map: Partial<Record<ReservationStatus, string>> = {
    PENDING: 'Na čekanju',
    STYLIST_REVIEW: 'U pregledu',
    CONFIRMED: 'Potvrđeno',
    ATTENDANCE_CONFIRMED: 'Dolazak potvrđen',
    IN_PROGRESS: 'U toku',
  };
  return map[status] ?? status;
}

function getStatusColor(status: ReservationStatus): string {
  if (status === 'CONFIRMED' || status === 'ATTENDANCE_CONFIRMED') return '#22c55e';
  if (status === 'IN_PROGRESS') return '#3b82f6';
  if (status === 'PENDING' || status === 'STYLIST_REVIEW') return '#eab308';
  return '#94a3b8';
}

function getBlogExcerpt(content: string, max = 110): string {
  const plain = (content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return 'Savjeti i inspiracija iz svijeta njege i frizerskih trendova.';
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}...` : plain;
}

function formatServicePrice(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '';
  return `${Math.round(amount)} KM`;
}

function ServiceTilePress({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps<'Home'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { connected: socketConnected } = useSocket();
  const user = useAuthStore((s) => s.user);
  const serviceCardWidth = Math.min(screenWidth * 0.66, 300);
  const sectionScrollRefs = useRef<Record<number, ScrollView | null>>({});
  const sectionInitOffsetApplied = useRef<Record<number, boolean>>({});

  const [settings, setSettings] = useState<PublicSetting[] | null>(null);
  const [categoriesWithServices, setCategoriesWithServices] = useState<CategoryWithServices[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [beforeAfterPairs, setBeforeAfterPairs] = useState<BeforeAfterPair[]>([]);
  const [featuredReview, setFeaturedReview] = useState<{
    comment: string | null;
    serviceRating: number;
    user?: { firstName: string | null; lastName: string | null };
    service?: { name: string };
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openDebtsTotal, setOpenDebtsTotal] = useState(0);
  const [openDebtsCount, setOpenDebtsCount] = useState(0);
  const [upcomingReservation, setUpcomingReservation] = useState<Reservation | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, categories, catalogServices, blogRes, debtsRes] = await Promise.all([
        fetchPublicSettings(),
        fetchAllPublicServiceCategories<ServiceCategory>({ activeOnly: true }),
        fetchAllPublicServices<Service>({ activeOnly: true }),
        api.get<BlogPost[] | { items: BlogPost[] }>('/api/blog', { params: { limit: 3, offset: 0 } }),
        user
          ? api.get<Array<{ amount: number | string }>>('/api/client-debts/me').catch(() => null)
          : Promise.resolve(null),
      ]);

      if (debtsRes?.data && Array.isArray(debtsRes.data)) {
        setOpenDebtsCount(debtsRes.data.length);
        setOpenDebtsTotal(debtsRes.data.reduce((acc, d) => acc + Number(d.amount || 0), 0));
      } else {
        setOpenDebtsCount(0);
        setOpenDebtsTotal(0);
      }

      setSettings(normalizeSettings(settingsRes));
      const blogOn = getSettingValue(normalizeSettings(settingsRes), 'public_feature_blog', 'true').toLowerCase() !== 'false';
      const blogItems = Array.isArray(blogRes.data) ? blogRes.data : blogRes.data.items;
      setBlogPosts(blogOn ? blogItems.slice(0, 3) : []);

      const servicesByCategory = new Map<string, Service[]>();
      catalogServices.forEach((service) => {
        const categoryId = service.subcategory?.categoryId;
        if (!categoryId) return;
        const services = servicesByCategory.get(categoryId) ?? [];
        services.push(service);
        servicesByCategory.set(categoryId, services);
      });
      setCategoriesWithServices(
        categories.flatMap((category) => {
          const services = servicesByCategory.get(category.id) ?? [];
          return services.length > 0 ? [{ category, services }] : [];
        }),
      );
      try {
        const { data } = await api.get<{ items: BeforeAfterPair[] }>('/api/daily-log/before-after', {
          params: { limit: 6, random: 1 },
        });
        const list = Array.isArray(data?.items) ? data.items : [];
        setBeforeAfterPairs(list.slice(0, 1));
      } catch {
        setBeforeAfterPairs([]);
      }
      try {
        const { data: review } = await api.get<{
          comment: string | null;
          serviceRating: number;
          user?: { firstName: string | null; lastName: string | null };
          service?: { name: string };
        } | null>('/api/reviews/featured/random');
        setFeaturedReview(
          getSettingValue(normalizeSettings(settingsRes), 'public_feature_reviews', 'true').toLowerCase() === 'false'
            ? null
            : review ?? null,
        );
      } catch {
        setFeaturedReview(null);
      }
    } catch { /* silent */ }
  }, [user]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setUpcomingReservation(null);
      return;
    }

    const ACTIVE_STATUSES: ReservationStatus[] = [
      'PENDING',
      'STYLIST_REVIEW',
      'CONFIRMED',
      'ATTENDANCE_CONFIRMED',
      'IN_PROGRESS'
    ];
    let cancelled = false;

    api.get<Reservation[]>('/api/reservations', { params: { asClient: true } })
      .then(({ data }) => {
        if (cancelled) return;

        const arr = Array.isArray(data) ? data : (data as any)?.data ?? [];
        const next = arr.find(
          (r: any) =>
            ACTIVE_STATUSES.includes(r.status) &&
            isUpcoming(r.reservationDate, r.endTime),
        ) ?? null;

        setUpcomingReservation(next);
      })
      .catch(() => {
        if (!cancelled) setUpcomingReservation(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshHomeData = useAutoRefresh(fetchData, {
    intervalMs: 60000,
    connectedIntervalMs: 300000,
    isSocketConnected: socketConnected,
  });
  usePublicContentSocketRefresh(refreshHomeData);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHomeData();
    setRefreshing(false);
  }, [refreshHomeData]);

  const heroImageUrl = resolveHeroImageUrl(getSettingValue(settings, 'public_hero_image', ''));
  const heroSubtitle = getSettingValue(settings, 'public_hero_subtitle', t('home.heroSubtitle'));
  const heroCtaText = getSettingValue(settings, 'public_hero_cta_text', t('home.bookNow'));

  const upcomingServiceName = (() => {
    if (!upcomingReservation) return 'Rezervacija';

    // 1. Ako imamo niz stavki (items) i u njima nazive servisa, spoji ih zarezom
    if (upcomingReservation.items && upcomingReservation.items.length > 0) {
      const names = upcomingReservation.items
        .map(item => item.service?.name)
        .filter(Boolean); // Uklanja null/undefined vrijednosti

      if (names.length > 0) return names.join(' + ');
    }

    // 2. Fallback na pojedinačni service objekt ako items ne postoje
    return upcomingReservation.service?.name ?? 'Rezervacija';
  })();


  const heroBlockHeight = insets.top + HERO_HEIGHT;

  const maintenanceOn = getSettingValue(settings, 'system_maintenance_mode', 'false').toLowerCase() === 'true';
  const maintenanceMsg =
    getSettingValue(settings, 'public_maintenance_message', '').trim() ||
    'Radimo na poboljšanjima. Molimo pokušajte kasnije.';

  if (settings !== null && maintenanceOn) {
    return (
      <View
        style={[
          styles.safe,
          {
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: insets.top + 24,
            paddingBottom: tabBarBottom + 24,
          },
        ]}
      >
        <Text style={[styles.heroTitle, { textAlign: 'center', marginBottom: 16 }]}>Privremeno nedostupno</Text>
        <Text style={{ fontSize: 16, textAlign: 'center', color: colors.text, lineHeight: 22, opacity: 0.9 }}>
          {maintenanceMsg}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={[styles.heroShell, { backgroundColor: colors.background }]}>
          <View style={[styles.hero, { height: heroBlockHeight, borderCurve: 'continuous' }]}>
            <MediaImage
              uri={heroImageUrl}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroGrayVeil} pointerEvents="none" />
            <LinearGradient
              colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.08)', 'transparent']}
              locations={[0, 0.18, 0.48, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.heroOverlay}>
              <BlurView
                intensity={55}
                tint="dark"
                style={styles.heroOverlayBlur}
              />
              <View style={styles.heroOverlayContent}>
                <View style={styles.heroOverlayCopy}>
                  {user ? (
                    <Text style={styles.welcome}>
                      {t('home.welcome')}, {user.firstName}
                    </Text>
                  ) : null}
                  <Text
                    style={styles.heroSubtitle}
                    numberOfLines={2}
                  >
                    {heroSubtitle}
                  </Text>
                </View>
                <View style={styles.heroOverlayAction}>
                  <Button
                    title={heroCtaText}
                    variant="ghost"
                    size="sm"
                    style={styles.heroOverlayButton}
                    textStyle={styles.heroOverlayButtonText}
                    onPress={() =>
                      navigation.getParent()?.navigate('ServicesTab', {
                        screen: 'Reservation',
                        params: { origin: 'home' },
                      })
                    }
                    icon={<Ionicons name="calendar-outline" size={15} color="rgba(0,0,0,0.8)" />}
                  />
                </View>
              </View>
            </View>
          </View>
          </View>
        </View>
        <View style={styles.homeBelowHero}>
        <View style={[styles.homeBelowHeroSurface, { backgroundColor: colors.background }]}>
        <View style={{ backgroundColor: 'transparent', paddingBottom: spacing.xxl, paddingTop: spacing.sm }}>
        {user && openDebtsCount > 0 ? (
          <TouchableOpacity
            onPress={() =>
              (navigation.getParent() as { navigate: (name: string) => void } | undefined)?.navigate(
                'ProfileTab',
              )
            }
            style={{
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: borderRadius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Imate otvoreno dugovanje</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                {openDebtsCount} stavk(i) · {openDebtsTotal.toFixed(2)} KM — pogledajte profil
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        {/* Kartica sljedećeg termina — prikazuje se samo ako postoji */}
        {upcomingReservation ? (
          <Pressable
            onPress={() =>
              navigation.getParent()?.navigate('ReservationsTab', {
                screen: 'ReservationDetail',
                params: { reservationId: upcomingReservation.id },
              })
            }
            style={({ pressed }) => [
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.upcomingInner}>
              <View style={styles.upcomingLeft}>
                <View style={[styles.upcomingDot, { backgroundColor: getStatusColor(upcomingReservation.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.upcomingLabel, { color: colors.textSecondary }]}>Sljedeći termin</Text>
                  <Text
                    style={[styles.upcomingService, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    >
                    {upcomingServiceName}
                    </Text>
                  <Text style={[styles.upcomingDate, { color: colors.textMuted }]}>
                    {formatReservationDate(upcomingReservation.reservationDate, upcomingReservation.startTime)}
                  </Text>
                </View>
              </View>
              <View style={[styles.upcomingBadge, { backgroundColor: getStatusColor(upcomingReservation.status) + '22' }]}>
                <Text style={[styles.upcomingBadgeText, { color: getStatusColor(upcomingReservation.status) }]}>
                  {getStatusLabel(upcomingReservation.status)}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        {/* Services by category */}
        {categoriesWithServices.map(({ category, services }, sectionIndex) => {
          const isMenRow = sectionIndex % 2 === 0;
          // Muškarci: inicijalno prikaz sa kraja liste (zadnji servis prvi vidljiv).
          // Žene: normalan početak (prvi servis prvi vidljiv).
          const displayedServices = services;
          return (
          <View
            key={category.id}
            style={[styles.section, sectionIndex === 0 && styles.sectionFirst]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {category.name}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.getParent()?.navigate('ServicesTab', {
                    screen: 'ServiceDetail',
                    params: { categoryId: category.id, categoryName: category.name },
                  })
                }
              >
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hScrollOuter}>
              <ScrollView
                ref={(node) => {
                  sectionScrollRefs.current[sectionIndex] = node;
                }}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
                snapToInterval={serviceCardWidth + spacing.md + 1}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum
                onContentSizeChange={() => {
                  if (!isMenRow) return;
                  if (sectionInitOffsetApplied.current[sectionIndex]) return;
                  sectionInitOffsetApplied.current[sectionIndex] = true;
                  sectionScrollRefs.current[sectionIndex]?.scrollToEnd({ animated: false });
                }}
              >
                {displayedServices.map((service, index) => (
                  <View key={service.id}>
                    {(() => {
                      const variant = index % 3;
                      const cardHeight = variant === 0 ? 182 : variant === 1 ? 158 : 170;
                      const verticalOffset = variant === 1 ? 14 : 0;
                      const isFeatured = variant === 0;
                      return (
                    <ServiceTilePress
                      style={[styles.serviceCardWrap, { marginTop: verticalOffset }]}
                      onPress={() =>
                        navigation.getParent()?.navigate('ServicesTab', {
                          screen: 'ServiceSingleDetail',
                          params: {
                            serviceId: service.id,
                            serviceName: service.name,
                          },
                        })
                      }
                    >
                      <View
                        style={[
                          styles.serviceCard,
                          { width: serviceCardWidth, height: cardHeight, borderRadius: borderRadius.xxl },
                        ]}
                      >
                          <MediaImage
                            uri={getImageUrl(service.heroImage)}
                            style={StyleSheet.absoluteFill}
                          />
                        <LinearGradient
                          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.42)']}
                          locations={[0, 0.5, 1]}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                        {isFeatured ? (
                          <View style={styles.serviceFeaturedBadge}>
                            <Ionicons name="sparkles-outline" size={11} color="#fff" />
                            <Text style={styles.serviceFeaturedBadgeText}>Istaknuto</Text>
                          </View>
                        ) : null}
                        <View style={styles.serviceLabels}>
                          <Text style={styles.serviceName} numberOfLines={2}>
                            {service.name}
                          </Text>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceMeta}>{service.durationMinutes} min</Text>
                            <Text style={styles.servicePrice}>{formatServicePrice(service.price)}</Text>
                          </View>
                        </View>
                      </View>
                    </ServiceTilePress>
                      );
                    })()}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
          );
        })}

        {/* Zadovoljni klijenti – 1 featured recenzija + prije/poslije + CTA */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Zadovoljni klijenti
            </Text>
          </View>
          <Card style={[styles.satisfiedCard, { backgroundColor: colors.card || colors.background }]}>
            {beforeAfterPairs.length > 0 && (
              <View style={styles.satisfiedSliderWrap}>
                <BeforeAfterSlider
                  beforeSrc={getUploadUrl(beforeAfterPairs[0].before.pathMedium ?? beforeAfterPairs[0].before.pathThumb ?? beforeAfterPairs[0].before.pathOriginal)}
                  afterSrc={getUploadUrl(beforeAfterPairs[0].after.pathMedium ?? beforeAfterPairs[0].after.pathThumb ?? beforeAfterPairs[0].after.pathOriginal)}
                  width={screenWidth - spacing.md * 4}
                  height={180}
                />
              </View>
            )}
            {featuredReview ? (
              <View style={styles.satisfiedReview}>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name={i <= featuredReview.serviceRating ? 'star' : 'star-outline'}
                      size={18}
                      color={colors.primary}
                    />
                  ))}
                </View>
                <Text style={[styles.reviewQuote, { color: colors.text }]} numberOfLines={3}>
                  „{featuredReview.comment || 'Odličan servis i atmosfera, preporučujem!'}"
                </Text>
                <Text style={[styles.reviewAuthor, { color: colors.primary }]}>
                  — {featuredReview.user?.firstName
                    ? `${featuredReview.user.firstName}${featuredReview.user.lastName ? ` ${featuredReview.user.lastName[0]}.` : ''}`
                    : 'Zadovoljni klijent'}
                  {featuredReview.service?.name ? ` (${featuredReview.service.name})` : ''}
                </Text>
              </View>
            ) : (
              <Text style={[styles.beforeAfterHint, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                Naši klijenti dijele iskustva. Pogledajte transformacije i recenzije.
              </Text>
            )}
            <View style={styles.satisfiedCta}>
              <Button
                title="Pogledaj sve transformacije"
                onPress={() => navigation.navigate('SatisfiedClients')}
                variant="outline"
                size="sm"
              />
            </View>
          </Card>
        </View>

        {/* Latest Blog Posts */}
        {blogPosts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('home.latestBlog')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('BlogList')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            {blogPosts.map((post) => (
              <View key={post.id}>
                <Card
                  style={styles.blogCard}
                  onPress={() => navigation.navigate('BlogPost', { slug: post.slug })}
                >
                  <View style={styles.blogCoverWrap}>
                    <MediaImage
                      uri={resolveBlogImageUrl(post.heroImage)}
                      style={styles.blogCover}
                      transition={120}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.5)']}
                      style={styles.blogCoverOverlay}
                      pointerEvents="none"
                    />
                    <View style={styles.blogTag}>
                      <Ionicons name="newspaper-outline" size={12} color="#fff" />
                      <Text style={styles.blogTagText}>Blog</Text>
                    </View>
                    {!!post.publishedAt && (
                      <View style={styles.blogDatePill}>
                        <Ionicons name="calendar-outline" size={11} color="#fff" />
                        <Text style={styles.blogDatePillText}>{formatBlogDate(post.publishedAt)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.blogTitle, { color: colors.text }]} numberOfLines={2}>
                    {post.title}
                  </Text>
                  <Text style={[styles.blogExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
                    {getBlogExcerpt(post.excerpt ?? post.content ?? '')}
                  </Text>
                  <Text style={[styles.blogDate, { color: colors.textSecondary }]}>
                    {formatBlogDate(post.publishedAt)}
                  </Text>
                </Card>
              </View>
            ))}
          </View>
        )}
        {/* Contact details */}
        {(() => {
          const address = getSettingValue(settings, 'public_contact_address', '').trim();
          const phone = getSettingValue(settings, 'public_contact_phone', '').trim();
          const email = getSettingValue(settings, 'public_contact_email', '').trim();
          const facebook = getSettingValue(settings, 'public_social_facebook', '').trim();
          const instagram = getSettingValue(settings, 'public_social_instagram', '').trim();
          const tiktok = getSettingValue(settings, 'public_social_tiktok', '').trim();
          const hasAny = !!(address || phone || email || facebook || instagram || tiktok);
          if (!hasAny) return null;
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Kontakt</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.getParent()?.navigate('ProfileTab', { screen: 'Contact' } as any)
                  }
                >
                  <Text style={[styles.seeAll, { color: colors.primary }]}>Detalji</Text>
                </TouchableOpacity>
              </View>
              <Card style={styles.satisfiedCard}>
                {address ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 }}>
                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                    <Text style={{ color: colors.textSecondary, flex: 1 }}>{address}</Text>
                  </View>
                ) : null}
                {phone ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${phone}`)}
                    activeOpacity={0.75}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 }}
                  >
                    <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                    <Text style={{ color: colors.textSecondary, flex: 1 }}>{phone}</Text>
                  </TouchableOpacity>
                ) : null}
                {email ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`mailto:${email}`)}
                    activeOpacity={0.75}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 }}
                  >
                    <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
                    <Text style={{ color: colors.textSecondary, flex: 1 }}>{email}</Text>
                  </TouchableOpacity>
                ) : null}

                {facebook || instagram || tiktok ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
                    {facebook ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(facebook)}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                        }}
                      >
                        <Ionicons name="logo-facebook" size={16} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>Facebook</Text>
                      </TouchableOpacity>
                    ) : null}
                    {instagram ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(instagram)}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                        }}
                      >
                        <Ionicons name="logo-instagram" size={16} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>Instagram</Text>
                      </TouchableOpacity>
                    ) : null}
                    {tiktok ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(tiktok)}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                        }}
                      >
                        <Ionicons name="link-outline" size={16} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>TikTok</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            </View>
          );
        })()}
        </View>
        </View>
        <View style={{ height: tabBarBottom }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    paddingTop: 0,
    flexGrow: 1,
  },
  homeBelowHero: {
    marginTop: -48,
    zIndex: 10,
  },
  homeBelowHeroSurface: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  heroWrap: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
    zIndex: 1,
  },
  heroShell: {
    borderRadius: 0,
    overflow: 'hidden',
    boxShadow: '0px 12px 24px rgba(15, 23, 42, 0.08)',
  },
  hero: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    width: '100%',
  },
  heroGrayVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 28, 30, 0.18)',
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  heroOverlay: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 64,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroOverlayBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlayGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  heroOverlayCopy: {
    flex: 1,
  },
  heroOverlayAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  heroOverlayButton: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  heroOverlayButtonText: {
    color: 'rgba(0,0,0,0.85)',
    fontWeight: '700',
    fontSize: 13,
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: fontFamily.heading,
    letterSpacing: 1.8,
    lineHeight: 42,
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: -0.1,
    lineHeight: 21,
    textAlign: 'left',
    color: 'rgba(255, 255, 255, 0.96)',
  },
  welcome: {
    fontSize: 12,
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.2,
    lineHeight: 17,
    textAlign: 'left',
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroCta: { marginTop: 6, alignSelf: 'flex-start' },
  infoCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  upcomingInner: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  upcomingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  upcomingLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  upcomingService: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    flexShrink: 1
  },
  upcomingDate: {
    fontSize: 12,
    marginTop: 2,
  },
  upcomingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  upcomingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: { marginTop: spacing.md, paddingHorizontal: spacing.md },
  sectionFirst: { marginTop: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 0.35,
    lineHeight: 26,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 0.35,
  },
  hScrollOuter: {},
  hScroll: {
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  serviceCardWrap: {
    marginBottom: spacing.xs,
  },
  serviceCard: {
    height: 160,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  serviceLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  serviceFeaturedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  serviceFeaturedBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 0.2,
  },
  serviceCardPlaceholder: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 15,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 0.2,
    lineHeight: 20,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  serviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  serviceMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    fontFamily: fontFamily.body,
    letterSpacing: 0.35,
  },
  servicePrice: {
    fontSize: 12,
    color: '#fff',
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 0.25,
  },
  beforeAfterHint: { fontSize: 13, marginBottom: spacing.sm },
  beforeAfterEmpty: { fontSize: 14, marginBottom: spacing.sm },
  satisfiedCard: { overflow: 'hidden', marginBottom: spacing.sm, padding: spacing.md },
  satisfiedSliderWrap: { marginBottom: spacing.md },
  satisfiedReview: { marginBottom: spacing.sm },
  starRow: { flexDirection: 'row', gap: 2, marginBottom: spacing.xs },
  reviewQuote: { fontStyle: 'italic', fontSize: 15, lineHeight: 22, marginBottom: spacing.xs },
  reviewAuthor: { fontSize: 14, fontWeight: '600' },
  satisfiedCta: { paddingTop: spacing.sm, alignItems: 'center' },
  blogCard: { marginBottom: spacing.sm, overflow: 'hidden' },
  blogCoverWrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  blogCover: {
    width: '100%',
    height: 158,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  blogCoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blogTag: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  blogTagText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 0.25,
  },
  blogDatePill: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  blogDatePillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.2,
  },
  blogTitle: {
    fontSize: 17,
    fontFamily: fontFamily.bodySemiBold,
    lineHeight: 24,
  },
  blogExcerpt: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamily.body,
  },
  blogDate: {
    fontSize: 13,
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
  },
});
