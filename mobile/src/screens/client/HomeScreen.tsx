import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
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
import type { HomeScreenProps } from '../../navigation/types';
import type { Service, BlogPost, ServiceCategory } from '../../types';

interface BeforeAfterPair {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const HERO_HEIGHT = 300;

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=2000';

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

export function HomeScreen({ navigation }: HomeScreenProps<'Home'>) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero with image from settings */}
        <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.heroWrap}>
          <View style={[styles.hero, { minHeight: HERO_HEIGHT }]}>
            <Image
              source={{ uri: heroImageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.75)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <View style={styles.heroDecoration}>
                <Ionicons name="sparkles" size={20} color={colors.primary} style={styles.heroSparkLeft} />
                <View style={[styles.heroLine, { backgroundColor: colors.primary }]} />
                <Ionicons name="sparkles" size={20} color={colors.primary} style={styles.heroSparkRight} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.primary }]}>
                {heroTitle.replace(/\\n/g, '\n')}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.champagne }]} numberOfLines={2}>
                {heroSubtitle}
              </Text>
              {user && (
                <Text style={[styles.welcome, { color: colors.gray400 }]}>
                  {t('home.welcome')}, {user.firstName}!
                </Text>
              )}
              <Button
                title={getSettingValue(settings, 'public_hero_cta_text', t('home.bookNow'))}
                onPress={() => navigation.getParent()?.navigate('ServicesTab', { screen: 'Reservation' })}
                style={styles.heroCta}
                icon={<Ionicons name="calendar-outline" size={18} color={colors.primaryText} />}
              />
            </View>
          </View>
        </Animated.View>

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
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.getParent()?.navigate('ServicesTab', {
                        screen: 'Reservation',
                        params: { serviceId: service.id, serviceName: service.name },
                      })
                    }
                    style={styles.serviceCardWrap}
                  >
                    <View style={[styles.serviceCard, { width: CARD_WIDTH }]}>
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
                        colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                        style={styles.serviceCardOverlay}
                      />
                      <View style={styles.serviceCardContent}>
                        <Text style={styles.serviceName} numberOfLines={2}>
                          {service.name}
                        </Text>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceMeta}>
                            {service.durationMinutes} min
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
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
                  width={SCREEN_WIDTH - spacing.md * 4}
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
                  <Text style={[styles.blogTitle, { color: colors.text }]} numberOfLines={2}>
                    {post.title}
                  </Text>
                  <Text style={[styles.blogDate, { color: colors.textSecondary }]}>
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString('bs-BA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''}
                  </Text>
                </Card>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  heroWrap: { marginBottom: spacing.lg },
  hero: {
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    minHeight: HERO_HEIGHT,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroLine: {
    width: 40,
    height: 2,
    marginHorizontal: spacing.sm,
  },
  heroSparkLeft: { opacity: 0.9 },
  heroSparkRight: { opacity: 0.9, transform: [{ scaleX: -1 }] },
  heroTitle: {
    fontSize: 28,
    fontFamily: fontFamily.heading,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    marginTop: spacing.xs,
    fontFamily: fontFamily.body,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  welcome: {
    fontSize: 14,
    marginTop: spacing.md,
    fontFamily: fontFamily.body,
  },
  heroCta: { marginTop: spacing.md },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: fontFamily.heading,
    letterSpacing: 0.3,
  },
  seeAll: { fontSize: 14, fontWeight: '600', fontFamily: fontFamily.bodySemiBold },
  hScroll: { gap: spacing.md, paddingRight: spacing.md },
  serviceCardWrap: { marginBottom: spacing.xs },
  serviceCard: {
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  serviceCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  serviceCardPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.sm,
  },
  serviceName: {
    fontSize: 15,
    fontFamily: fontFamily.bodySemiBold,
    color: '#fff',
  },
  serviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  serviceMeta: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: fontFamily.body },
  beforeAfterHint: { fontSize: 13, marginBottom: spacing.sm },
  beforeAfterEmpty: { fontSize: 14, marginBottom: spacing.sm },
  satisfiedCard: { overflow: 'hidden', marginBottom: spacing.sm, padding: spacing.md },
  satisfiedSliderWrap: { marginBottom: spacing.md },
  satisfiedReview: { marginBottom: spacing.sm },
  starRow: { flexDirection: 'row', gap: 2, marginBottom: spacing.xs },
  reviewQuote: { fontStyle: 'italic', fontSize: 15, lineHeight: 22, marginBottom: spacing.xs },
  reviewAuthor: { fontSize: 14, fontWeight: '600' },
  satisfiedCta: { paddingTop: spacing.sm, alignItems: 'center' },
  blogCard: { marginBottom: spacing.sm },
  blogTitle: {
    fontSize: 17,
    fontFamily: fontFamily.bodySemiBold,
    lineHeight: 24,
  },
  blogDate: {
    fontSize: 13,
    marginTop: spacing.xs,
    fontFamily: fontFamily.body,
  },
});
