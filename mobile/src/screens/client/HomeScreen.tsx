import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
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
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { getImageUrl, getUploadUrl } from '../../services/api';
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

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=2000';
const DEFAULT_BLOG_IMAGE = 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=1200';

interface CategoryWithServices {
  category: ServiceCategory;
  services: Service[];
}

function getSettingValue(settings: { key: string; value: string }[] | null, key: string, fallback: string): string {
  if (!settings) return fallback;
  const item = settings.find((s) => s.key === key);
  return item?.value?.trim() || fallback;
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
  const user = useAuthStore((s) => s.user);
  const cardWidth = screenWidth * 0.42;

  const [settings, setSettings] = useState<{ key: string; value: string }[] | null>(null);
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

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, catRes, blogRes] = await Promise.all([
        api.get<{ key: string; value: string }[]>('/api/settings'),
        api.get<ServiceCategory[]>('/api/services/categories', { params: { activeOnly: true } }),
        api.get<BlogPost[]>('/api/blog', { params: { published: true } }),
      ]);

      setSettings(settingsRes.data);

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
      try {
        const { data } = await api.get<{ items: BeforeAfterPair[] }>('/api/daily-log/before-after', {
          params: { limit: 6, offset: 0 },
        });
        const list = Array.isArray(data?.items) ? data.items : [];
        const shuffled = [...list].sort(() => Math.random() - 0.5);
        setBeforeAfterPairs(shuffled.slice(0, 1));
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAutoRefresh(fetchData, { intervalMs: 60000 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const heroImageUrl = resolveHeroImageUrl(getSettingValue(settings, 'public_hero_image', ''));
  const heroTitle = getSettingValue(settings, 'public_hero_title', t('home.heroTitle'));
  const heroSubtitle = getSettingValue(settings, 'public_hero_subtitle', t('home.heroSubtitle'));

  const heroBg = colors.background;
  const heroBottomBlend: [string, string, string, string] = [
    colorWithAlpha(heroBg, 0),
    colorWithAlpha(heroBg, 0),
    colorWithAlpha(heroBg, 0.88),
    heroBg,
  ];

  const heroBlockHeight = insets.top + HERO_HEIGHT;

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
            <Image
              source={{ uri: heroImageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
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
              <Animated.View entering={FadeInDown.delay(520).duration(480).springify()} style={styles.heroCta}>
                <Button
                  title={getSettingValue(settings, 'public_hero_cta_text', t('home.bookNow'))}
                  onPress={() => navigation.getParent()?.navigate('ServicesTab', { screen: 'Reservation' })}
                  icon={<Ionicons name="calendar-outline" size={18} color={colors.primaryText} />}
                />
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
        {/* Services by category */}
        {categoriesWithServices.map(({ category, services }, sectionIndex) => (
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
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                {services.map((service, index) => (
                  <Animated.View
                    key={service.id}
                    entering={FadeInRight.delay(300 + sectionIndex * 80 + index * 60).duration(350).springify()}
                  >
                    <ServiceTilePress
                      style={styles.serviceCardWrap}
                      onPress={() =>
                        navigation.getParent()?.navigate('ServicesTab', {
                          screen: 'Reservation',
                          params: { serviceId: service.id, serviceName: service.name },
                        })
                      }
                    >
                      <View
                        style={[
                          styles.serviceCard,
                          { width: cardWidth, borderRadius: borderRadius.xxl },
                        ]}
                      >
                        {service.heroImage ? (
                          <Image
                            source={{ uri: getImageUrl(service.heroImage) }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.serviceCardPlaceholder, { backgroundColor: colors.accent }]}>
                            <Ionicons name="cut" size={36} color={colors.primary} />
                          </View>
                        )}
                        <LinearGradient
                          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.42)']}
                          locations={[0, 0.5, 1]}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                        <View style={styles.serviceLabels}>
                          <Text style={styles.serviceName} numberOfLines={2}>
                            {service.name}
                          </Text>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceMeta}>{service.durationMinutes} min</Text>
                          </View>
                        </View>
                      </View>
                    </ServiceTilePress>
                  </Animated.View>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        ))}

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
                    <Image
                      source={{ uri: resolveBlogImageUrl(post.heroImage) }}
                      style={styles.blogCover}
                      contentFit="cover"
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
    height: 24,
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
