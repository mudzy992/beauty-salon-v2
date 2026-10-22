import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { MediaBackdrop } from '../../components/MediaImage';
import { Button } from '../../components/ui/Button';
import api, { getUploadUrl } from '../../services/api';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';
import { spacing } from '../../theme';
import type { ServicesScreenProps } from '../../navigation/types';
import type { Service } from '../../types';
import type { Review } from '../../types';

type BeforeAfterPair = {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
};

type PublicReviewPage = {
  items?: Review[];
  total?: number;
  hasMore?: boolean;
  nextOffset?: number;
};

type ReviewPageResult = {
  items: Review[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
};

const REVIEW_PAGE_SIZE = 20;

function normalizeReviewPage(
  data: PublicReviewPage | Review[],
  offset: number,
): ReviewPageResult {
  if (Array.isArray(data)) {
    const items = data.slice(offset, offset + REVIEW_PAGE_SIZE);
    const nextOffset = offset + items.length;
    return {
      items,
      total: data.length,
      hasMore: nextOffset < data.length,
      nextOffset,
    };
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === 'number' ? data.total : items.length;
  const nextOffset =
    typeof data?.nextOffset === 'number' ? data.nextOffset : offset + items.length;
  return {
    items,
    total,
    hasMore: data?.hasMore === true && items.length > 0,
    nextOffset,
  };
}

export function ServiceSingleDetailScreen({
  route,
  navigation,
}: ServicesScreenProps<'ServiceSingleDetail'>) {
  const { serviceId, serviceName } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { width } = useWindowDimensions();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewNextOffset, setReviewNextOffset] = useState<number | null>(null);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [loading, setLoading] = useState(true);
  const reviewRequestGeneration = useRef(0);

  useEffect(() => {
    navigation.setOptions({ title: serviceName || t('services.detail') });
  }, [navigation, serviceName, t]);

  useEffect(() => {
    const requestGeneration = ++reviewRequestGeneration.current;
    setLoading(true);
    setReviews([]);
    setReviewsTotal(0);
    setReviewNextOffset(null);
    setLoadingMoreReviews(false);

    (async () => {
      try {
        const [svcRes, revRes] = await Promise.all([
          api.get<Service>(`/api/services/${serviceId}`),
          api.get<PublicReviewPage | Review[]>('/api/reviews', {
            params: {
              serviceId,
              approved: 'true',
              limit: REVIEW_PAGE_SIZE,
              offset: 0,
            },
          }),
        ]);
        if (requestGeneration !== reviewRequestGeneration.current) return;
        const page = normalizeReviewPage(revRes.data, 0);
        setService(svcRes.data);
        setReviews(page.items);
        setReviewsTotal(page.total);
        setReviewNextOffset(page.hasMore ? page.nextOffset : null);
      } catch {
        if (requestGeneration !== reviewRequestGeneration.current) return;
        setService(null);
        setReviews([]);
        setReviewsTotal(0);
        setReviewNextOffset(null);
      } finally {
        if (requestGeneration === reviewRequestGeneration.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      if (requestGeneration === reviewRequestGeneration.current) {
        reviewRequestGeneration.current += 1;
      }
    };
  }, [serviceId]);

  const loadMoreReviews = useCallback(async () => {
    const offset = reviewNextOffset;
    if (offset === null || loadingMoreReviews) return;

    const requestGeneration = reviewRequestGeneration.current;
    setLoadingMoreReviews(true);
    try {
      const { data } = await api.get<PublicReviewPage | Review[]>('/api/reviews', {
        params: {
          serviceId,
          approved: 'true',
          limit: REVIEW_PAGE_SIZE,
          offset,
        },
      });
      if (requestGeneration !== reviewRequestGeneration.current) return;

      const page = normalizeReviewPage(data, offset);
      setReviews((current) => {
        const existingIds = new Set(current.map((review) => review.id));
        return [
          ...current,
          ...page.items.filter((review) => !existingIds.has(review.id)),
        ];
      });
      setReviewsTotal(page.total);
      setReviewNextOffset(page.hasMore ? page.nextOffset : null);
    } catch {
      // Keep the current offset so the user can retry.
    } finally {
      if (requestGeneration === reviewRequestGeneration.current) {
        setLoadingMoreReviews(false);
      }
    }
  }, [loadingMoreReviews, reviewNextOffset, serviceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPairs(true);
      try {
        const { data } = await api.get<{ items: BeforeAfterPair[] }>('/api/daily-log/before-after', {
          params: { serviceId, limit: 3, offset: 0 },
        });
        if (!cancelled) setPairs(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!cancelled) setPairs([]);
      } finally {
        if (!cancelled) setLoadingPairs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <Text style={{ color: colors.textSecondary }}>{t('common.error')}</Text>
      </View>
    );
  }

  const heroUri = service.heroImage ? getUploadUrl(service.heroImage) : null;
  const sliderSize = Math.max(220, width - spacing.md * 2);
  const canBook =
    !user?.gender || service.gender === user.gender;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Hero / backdrop */}
      <View style={styles.heroWrap}>
          <MediaBackdrop
            uri={heroUri}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            <View style={[styles.heroOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{service.name}</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={styles.heroMetaText}>{service.durationMinutes} min</Text>
              </View>
            </View>
          </MediaBackdrop>
      </View>

      {/* Description */}
      {service.shortDescription ? (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('services.description')}</Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {service.shortDescription}
          </Text>
        </Card>
      ) : null}

      {/* Reviews */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('reviews.title')} ({reviewsTotal})
        </Text>
        {reviews.length === 0 ? (
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>{t('reviews.noReviews')}</Text>
        ) : (
          <View style={styles.reviewList}>
            {reviews.map((r) => (
              <View key={r.id} style={[styles.reviewItem, { borderBottomColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewAuthor, { color: colors.text }]}>
                    {r.user?.firstName} {r.user?.lastName}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= (r.serviceRating || 0) ? 'star' : 'star-outline'}
                        size={14}
                        color={colors.primary}
                      />
                    ))}
                  </View>
                </View>
                {r.comment ? (
                  <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
                    {r.comment}
                  </Text>
                ) : null}
                <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString('bs-BA') : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
        {reviewNextOffset !== null ? (
          <Button
            title={t('reviews.loadMore')}
            onPress={() => void loadMoreReviews()}
            loading={loadingMoreReviews}
            size="sm"
            variant="ghost"
            style={styles.loadMoreReviews}
          />
        ) : null}
      </Card>

      {/* Before / After (work gallery) */}
      <Card style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Prije / Poslije</Text>
          <Button
            title="Vidi sve"
            size="sm"
            variant="ghost"
            onPress={() =>
              navigation.navigate('ServiceWorkGallery', {
                serviceId,
                serviceName: service.name,
              })
            }
          />
        </View>
        {loadingPairs ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : pairs.length === 0 ? (
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            Trenutno nema dostupnih transformacija za ovaj servis.
          </Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            {pairs.map((p) => (
              <BeforeAfterSlider
                key={p.id}
                beforeSrc={getUploadUrl(p.before.pathMedium ?? p.before.pathThumb ?? p.before.pathOriginal)}
                afterSrc={getUploadUrl(p.after.pathMedium ?? p.after.pathThumb ?? p.after.pathOriginal)}
                width={sliderSize}
                height={sliderSize}
              />
            ))}
          </View>
        )}
      </Card>

      {/* Book button */}
      {canBook ? (
        <Button
          title={t('services.bookService')}
          onPress={() =>
            navigation.navigate('Reservation', {
              serviceId: service.id,
              serviceName: service.name,
              startAtStep: 1,
              origin: 'service-single',
            })
          }
          style={styles.bookButton}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.md },
  heroWrap: {
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    marginBottom: spacing.md,
    minHeight: 180,
  },
  heroImage: { flex: 1, minHeight: 180, justifyContent: 'flex-end' },
  heroImageStyle: { borderRadius: 16, borderCurve: 'continuous' },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  heroContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontSize: 14, color: 'rgba(255,255,255,0.95)' },
  heroMetaDot: { color: 'rgba(255,255,255,0.7)' },
  heroPlaceholder: {
    minHeight: 180,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  section: { marginBottom: spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  bodyText: { fontSize: 14, lineHeight: 22 },
  reviewList: {},
  loadMoreReviews: { marginTop: spacing.sm },
  reviewItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontSize: 14, fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  reviewDate: { fontSize: 12 },
  bookButton: { marginTop: spacing.md },
});
