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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaImage } from '../../components/MediaImage';
import { LinearGradient } from 'expo-linear-gradient';
import { colorWithAlpha } from '../../theme/colorAlpha';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
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
import { spacing, borderRadius } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import type { HomeScreenProps } from '../../navigation/types';
import type { Service, BlogPost, ServiceCategory } from '../../types';

interface BeforeAfterPair {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

const HERO_HEIGHT = 300;
const PRESS_SPRING = { damping: 15, stiffness: 400 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function resolveHeroImageUrl(value: string): string {
  if (!value?.trim()) return '';
  const v = value.trim();
  if (v.startsWith('http')) return v;
  return getImageUrl(v) || '';
}

function resolveBlogImageUrl(value?: string): string {
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

function formatBrandWordDisplay(word: string): string {
  const raw = String(word ?? '').trim();
  const oneWord = raw.split(/\s+/)[0] ?? '';
  const upper = oneWord.slice(0, 8).toLocaleUpperCase('bs-BA');
  return upper || 'LOGO';
}

function resolveHeroImageUrl(value: string): string {
  if (!value?.trim()) return DEFAULT_HERO_IMAGE;
  const v = value.trim();
  if (v.startsWith('http')) return v;
  return getImageUrl(v) || DEFAULT_HERO_IMAGE;
}

function resolveBlogImageUrl(value?: string): string {
  if (!value?.trim()) return DEFAULT_BLOG_IMAGE;
  const v = value.trim();
  if (v.startsWith('http')) return v;
  return getImageUrl(v) || DEFAULT_BLOG_IMAGE;
}

function formatBlogDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('bs-BA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

/** Tačan broj za hero metrike (bez skraćivanja tipa 1.2k+). */
function formatExactStatCount(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const n = Math.max(0, Math.round(value));
  return n.toLocaleString('bs-BA');
}

function extractHomeStatsPayload(
  input: unknown,
): { servicesCount?: unknown; clientsCount?: unknown } | null {
  if (!input || typeof input !== 'object') return null;
  const direct = input as { servicesCount?: unknown; clientsCount?: unknown };
  if ('servicesCount' in direct || 'clientsCount' in direct) return direct;

  const nested = input as {
    data?: { servicesCount?: unknown; clientsCount?: unknown };
    items?: { servicesCount?: unknown; clientsCount?: unknown };
  };
  if (nested.data && typeof nested.data === 'object') return nested.data;
  if (nested.items && typeof nested.items === 'object') return nested.items;
  return null;
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, PRESS_SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps<'Home'>) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
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
  const [homeStats, setHomeStats] = useState<{ servicesCount: number; clientsCount: number } | null>(null);
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

  const parseStatCount = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
    }
    return null;
  };

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, catRes, blogRes, homeStatsRes, debtsRes] = await Promise.all([
        fetchPublicSettings(),
        api.get<ServiceCategory[]>('/api/services/categories', { params: { activeOnly: true } }),
        api.get<BlogPost[]>('/api/blog', { params: { published: true } }),
        api.get<{ servicesCount: number; clientsCount: number }>('/api/services/home-stats').catch(() => null),
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

      const withServices: CategoryWithServices[] = [];
      for (const cat of catRes.data) {
        try {
          const { data } = await api.get<ServiceCategory>(`/api/services/categories/${cat.id}`);
          const services: Service[] = [];
          data.subcategories?.forEach((sub) => {
            sub.services?.forEach((s) => services.push(s));
          });
          if (services.length > 0) {
            withServices.push({ category: data, services });
          }
        } catch { /* skip */ }
      }
      setCategoriesWithServices(withServices);
      setBlogPosts(blogRes.data.slice(0, 3));
      if (homeStatsRes?.data) {
        const statsPayload = extractHomeStatsPayload(homeStatsRes.data);
        const servicesCount = parseStatCount(statsPayload?.servicesCount);
        const clientsCount = parseStatCount(statsPayload?.clientsCount);
        if (servicesCount !== null && clientsCount !== null) {
          setHomeStats({ servicesCount, clientsCount });
        } else {
          // Fallback: servis count iz trenutno učitanih kategorija, klijenti ostaju nepoznati.
          const fallbackServicesCount = withServices.reduce((sum, item) => sum + item.services.length, 0);
          setHomeStats(
            fallbackServicesCount > 0
              ? { servicesCount: fallbackServicesCount, clientsCount: Number.NaN }
              : null,
          );
        }
      } else {
        const fallbackServicesCount = withServices.reduce((sum, item) => sum + item.services.length, 0);
        setHomeStats(
          fallbackServicesCount > 0
            ? { servicesCount: fallbackServicesCount, clientsCount: Number.NaN }
            : null,
        );
      }
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
        setFeaturedReview(review ?? null);
      } catch {
        setFeaturedReview(null);
      }
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePublicContentSocketRefresh(fetchData);
  useAutoRefresh(fetchData, {
    intervalMs: 60000,
    connectedIntervalMs: 300000,
    isSocketConnected: socketConnected,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const appLogo = getSettingValue(settings, 'app_logo', '');
  const appTitle = getSettingValue(settings, 'app_title', t('home.heroTitle'));
  const appLogoTextColor =
    getSettingValue(settings, 'app_logo_text_color', '').trim() || colors.primary;
  const hasLogo = !!appLogo?.trim();
  const heroImageUrl = resolveHeroImageUrl(getSettingValue(settings, 'public_hero_image', ''));
  const heroTitle = getSettingValue(settings, 'public_hero_title', appTitle);
  const heroSubtitle = getSettingValue(settings, 'public_hero_subtitle', t('home.heroSubtitle'));
  const servicesCountLabel = homeStats ? formatExactStatCount(homeStats.servicesCount) : '—';
  const clientsCountLabel = homeStats ? formatExactStatCount(homeStats.clientsCount) : '—';

  const heroBg = colors.background;
  const heroBottomBlend: [string, string, string, string] = [
    colorWithAlpha(heroBg, 0),
    colorWithAlpha(heroBg, 0),
    colorWithAlpha(heroBg, 0.88),
    heroBg,
  ];

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
          <View style={[styles.hero, { height: heroBlockHeight, borderCurve: 'continuous' }]}>
            <MediaImage
              uri={heroImageUrl}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroDim} pointerEvents="none" />
            <LinearGradient
              colors={heroBottomBlend}
              locations={[0, 0.38, 0.78, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[styles.heroContent, { paddingTop: insets.top }]}>

              {hasLogo ? (
                <>
                  <Animated.View
                    entering={FadeInDown.delay(220).duration(520).springify()}
                    style={styles.heroLogoBlock}
                  >
                    <MediaImage
                      uri={getImageUrl(appLogo) || getUploadUrl(appLogo) || appLogo}
                      style={styles.heroLogoLarge}
                      contentFit="contain"
                      accessibilityLabel={appTitle}
                      tintColor="#FFF"
                    />
                  </Animated.View>
                  {user ? (
                    <Animated.View
                    entering={FadeInDown.delay(140).duration(400).springify()}
                    style={styles.heroWelcomeAbove}
                    >
                    <Text style={styles.welcome}>
                        {t('home.welcome')}, {user.firstName}!
                    </Text>
                    </Animated.View>
                ) : null}
                  <Animated.Text
                    entering={FadeInDown.delay(380).duration(480).springify()}
                    style={styles.heroSubtitleUnderLogo}
                    numberOfLines={2}
                  >
                    {heroSubtitle}
                  </Animated.Text>
                </>
              ) : (
                <>
                  <Animated.Text
                    entering={FadeInDown.delay(220).duration(520).springify()}
                    style={styles.heroTitle}
                  >
                    {heroTitle.replace(/\\n/g, '\n')}
                  </Animated.Text>
                  <Animated.Text
                    entering={FadeInDown.delay(360).duration(500).springify()}
                    style={styles.heroSubtitle}
                    numberOfLines={2}
                  >
                    {heroSubtitle}
                  </Animated.Text>
                </>
              )}
              <Animated.View entering={FadeInDown.delay(520).duration(480).springify()} style={styles.heroCta}>
                <Button
                  title={getSettingValue(settings, 'public_hero_cta_text', t('home.bookNow'))}
                  onPress={() =>
                    navigation.getParent()?.navigate('ServicesTab', {
                      screen: 'Reservation',
                      params: { origin: 'home' },
                    })
                  }
                  icon={<Ionicons name="calendar-outline" size={18} color={colors.primaryText} />}
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(620).duration(480).springify()} style={styles.heroStatsRow}>
                <View
                  style={[
                    styles.heroStatChip,
                    isDark
                      ? styles.heroStatChipDark
                      : { backgroundColor: 'rgba(0,0,0,0.66)', borderColor: 'rgba(0,0,0,0.98)' },
                  ]}
                >
                  <Ionicons name="diamond-outline" size={13} color="#fff" />
                  <Text style={styles.heroStatText}>{servicesCountLabel} servisa</Text>
                </View>
                <View
                  style={[
                    styles.heroStatChip,
                    isDark
                      ? styles.heroStatChipDark
                      : { backgroundColor: 'rgba(0,0,0,0.66)', borderColor: 'rgba(0,0,0,0.98)' },
                  ]}
                >
                  <Ionicons name="people-outline" size={13} color="#fff" />
                  <Text style={styles.heroStatText}>{clientsCountLabel} klijenata</Text>
                </View>
              </Animated.View>
            </View>
          </View>
        </View>
        <View style={styles.homeBelowHero}>
        <View style={styles.homeBelowHeroSurface}>
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.homeBelowHeroFade}
          pointerEvents="none"
        />
        <View style={{ backgroundColor: colors.background, paddingBottom: spacing.xxl, paddingTop: spacing.xs }}>
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
        {/* Services by category */}
        {categoriesWithServices.map(({ category, services }, sectionIndex) => {
          const isMenRow = sectionIndex % 2 === 0;
          // Muškarci: inicijalno prikaz sa kraja liste (zadnji servis prvi vidljiv).
          // Žene: normalan početak (prvi servis prvi vidljiv).
          const displayedServices = services;
          return (
          <Animated.View
            key={category.id}
            entering={FadeInUp.delay(200 + sectionIndex * 100).duration(400).springify()}
            style={styles.section}
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
                  <Animated.View
                    key={service.id}
                    entering={FadeInRight.delay(300 + sectionIndex * 80 + index * 60).duration(350).springify()}
                  >
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
                  </Animated.View>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
          );
        })}

        {/* Zadovoljni klijenti – 1 featured recenzija + prije/poslije + CTA */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400).springify()}
          style={styles.section}
        >
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
        </Animated.View>

        {/* Latest Blog Posts */}
        {blogPosts.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(400).duration(400).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('home.latestBlog')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('BlogList')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            {blogPosts.map((post, index) => (
              <Animated.View
                key={post.id}
                entering={FadeInUp.delay(500 + index * 100).duration(350).springify()}
              >
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
                    {getBlogExcerpt(post.content)}
                  </Text>
                  <Text style={[styles.blogDate, { color: colors.textSecondary }]}>
                    {formatBlogDate(post.publishedAt)}
                  </Text>
                </Card>
              </Animated.View>
            ))}
          </Animated.View>
        )}

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
            <Animated.View entering={FadeInUp.delay(460).duration(420).springify()} style={styles.section}>
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
            </Animated.View>
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
    marginTop: -50,
  },
  homeBelowHeroSurface: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  homeBelowHeroFade: {
    height: 45,
    width: '100%',
  },
  heroWrap: {
    marginTop: 0,
    marginBottom: 0,
  },
  hero: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    width: '100%',
  },
  heroDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWelcomeAbove: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 2,
  },
  heroDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroLine: {
    width: 40,
    height: 2,
    marginHorizontal: spacing.sm,
  },
  heroSparkLeft: { opacity: 0.9 },
  heroSparkRight: { opacity: 0.9, transform: [{ scaleX: -1 }] },
  heroLogoBlock: {
    alignItems: 'center',
    marginTop: 12,
  },
  heroLogoLarge: {
    width: 300,
    height: 150
  },
  heroBrandTitle: {
    marginTop: spacing.sm,
    fontSize: 22,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 5,
    textAlign: 'center',
  },
  heroSubtitleUnderLogo: {
    fontSize: 14,
    marginTop: spacing.xs,
    fontFamily: fontFamily.body,
    letterSpacing: 0.35,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    letterSpacing: 0.35,
    lineHeight: 23,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  welcome: {
    fontSize: 12,
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.45,
    lineHeight: 15,
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroCta: { marginTop: spacing.md, width: '100%', alignItems: 'center' },
  heroStatsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  heroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroStatChipDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroStatText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.25,
  },
  section: { marginTop: spacing.md, paddingHorizontal: spacing.md },
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
    ...StyleSheet.absoluteFillObject,
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
