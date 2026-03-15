import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { getUploadUrl } from '../../services/api';
import { spacing } from '../../theme';
import type { ServicesScreenProps } from '../../navigation/types';
import type { Service } from '../../types';
import type { Review } from '../../types';

export function ServiceSingleDetailScreen({
  route,
  navigation,
}: ServicesScreenProps<'ServiceSingleDetail'>) {
  const { serviceId, serviceName } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: serviceName || t('services.detail') });
  }, [navigation, serviceName, t]);

  useEffect(() => {
    (async () => {
      try {
        const [svcRes, revRes] = await Promise.all([
          api.get<Service>(`/api/services/${serviceId}`),
          api.get<Review[]>(`/api/reviews`, {
            params: { serviceId, approved: 'true' },
          }),
        ]);
        setService(svcRes.data);
        setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      } catch {
        setService(null);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    })();
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero / backdrop */}
      <View style={styles.heroWrap}>
        {heroUri ? (
          <ImageBackground
            source={{ uri: heroUri }}
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
          </ImageBackground>
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.accent }]}>
            <Ionicons name="cut" size={48} color={colors.primary} />
            <Text style={[styles.heroTitle, { color: colors.text }]}>{service.name}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>
                {service.durationMinutes} min
              </Text>
            </View>
          </View>
        )}
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
          {t('reviews.title')} ({reviews.length})
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
      </Card>

      {/* Book button */}
      <Button
        title={t('services.bookService')}
        onPress={() =>
          navigation.navigate('Reservation', {
            serviceId: service.id,
            serviceName: service.name,
          })
        }
        style={styles.bookButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  heroWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
    minHeight: 180,
  },
  heroImage: { flex: 1, minHeight: 180, justifyContent: 'flex-end' },
  heroImageStyle: { borderRadius: 16 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
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
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  bodyText: { fontSize: 14, lineHeight: 22 },
  reviewList: {},
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
