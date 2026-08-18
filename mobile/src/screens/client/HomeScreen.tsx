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

const HERO_HEIGHT = 168;
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

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, catRes, blogRes, debtsRes] = await Promise.all([
        fetchPublicSettings(),
        api.get<ServiceCategory[]>('/api/services/categories', { params: { activeOnly: true } }),
        api.get<BlogPost[]>('/api/blog', { params: { published: true } }),
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
      setBlogPosts(blogOn ? blogRes.data.slice(0, 3) : []);

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

  const heroImageUrl = resolveHeroImageUrl(getSettingValue(settings, 'public_hero_image', ''));
  const heroSubtitle = getSettingValue(settings, 'public_hero_subtitle', t('home.heroSubtitle'));
  const heroCtaText = getSettingValue(settings, 'public_hero_cta_text', t('home.bookNow'));

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
            <View style={styles.heroGrayVeil} pointerEvents="none" />
            <LinearGradient
              colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.08)', 'transparent']}
              locations={[0, 0.18, 0.48, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>
        </View>
        <View style={[styles.heroIntro, { backgroundColor: colors.background }]}>
          {user ? (
            <Animated.Text
              entering={FadeInDown.delay(80).duration(360).springify()}
              style={[styles.welcome, { color: colors.textMuted }]}
            >
              {t('home.welcome')}, {user.firstName}
            </Animated.Text>
          ) : null}
          <Animated.Text
            entering={FadeInDown.delay(160).duration(400).springify()}
            style={[styles.heroSubtitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {heroSubtitle}
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(240).duration(400).springify()} style={styles.heroCta}>
            <Button
              title={heroCtaText}
              size="sm"
              onPress={() =>
                navigation.getParent()?.navigate('ServicesTab', {
                  screen: 'Reservation',
                  params: { origin: 'home' },
                })
              }
              icon={<Ionicons name="calendar-outline" size={16} color={colors.primaryText} />}
            />
          </Animated.View>
        </View>
        <View style={styles.homeBelowHero}>
        <View style={styles.homeBelowHeroSurface}>
        <View style={{ backgroundColor: colors.background, paddingBottom: spacing.xxl, paddingTop: 0 }}>
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
    marginTop: 0,
  },
  homeBelowHeroSurface: {
    position: 'relative',
    backgroundColor: 'transparent',
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
  heroGrayVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 28, 30, 0.18)',
  },
  heroIntro: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'flex-start',
    gap: 6,
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
    fontSize: 22,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: -0.3,
    lineHeight: 28,
    textAlign: 'left',
  },
  welcome: {
    fontSize: 13,
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.2,
    lineHeight: 18,
    textAlign: 'left',
  },
  heroCta: { marginTop: 6, alignSelf: 'flex-start' },
  section: { marginTop: spacing.md, paddingHorizontal: spacing.md },
  sectionFirst: { marginTop: spacing.sm },
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
