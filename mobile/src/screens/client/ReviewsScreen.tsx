import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { spacing, borderRadius } from '../../theme';
import type { ReservationsScreenProps } from '../../navigation/types';

function StarRating({
  rating,
  onRate,
  category,
  size = 32,
}: {
  rating: number;
  onRate: (r: number) => void;
  category: string;
  size?: number;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          accessibilityRole="radio"
          accessibilityLabel={t('reviews.ratingOption', { category, rating: star, total: 5 })}
          accessibilityHint={t('reviews.ratingSelectionHint')}
          accessibilityState={{ selected: rating === star }}
          onPress={() => onRate(star)}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ReviewsScreen({ route, navigation }: ReservationsScreenProps<'WriteReview'>) {
  const { reservationId, serviceId } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();

  const [serviceRating, setServiceRating] = useState(0);
  const [stylistRating, setStylistRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reservationId || !serviceId) {
      Alert.alert(t('common.error'), t('reviews.completedBookingRequired'));
      return;
    }
    if (serviceRating === 0) {
      Alert.alert(t('common.error'), t('reviews.rateServiceRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/reviews', {
        serviceId,
        reservationId,
        serviceRating,
        stylistRating: stylistRating || undefined,
        comment: comment.trim() || undefined,
      });
      Alert.alert(t('reviews.reviewSuccess'), t('reviews.reviewSuccessMessage'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
    } finally {
      setSubmitting(false);
    }
  };

  if (!reservationId || !serviceId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          icon="star-outline"
          title={t('reviews.completedBookingRequired')}
          message={t('reviews.completedBookingRequiredMessage')}
          actionLabel={t('common.back')}
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textSecondary }}>
          {t('reviews.verifiedBookingHint')}
        </Text>
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('reviews.serviceRating')}
        </Text>
        <StarRating
          rating={serviceRating}
          onRate={setServiceRating}
          category={t('reviews.serviceRating')}
        />
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('reviews.stylistRating')}
        </Text>
        <StarRating
          rating={stylistRating}
          onRate={setStylistRating}
          category={t('reviews.stylistRating')}
          size={28}
        />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('reviews.comment')}
        </Text>
        <TextInput
          style={[
            styles.commentInput,
            {
              color: colors.inputText,
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
            },
          ]}
          placeholder={t('reviews.commentPlaceholder')}
          placeholderTextColor={colors.inputPlaceholder}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </Card>

      <Button
        title={t('reviews.submitReview')}
        onPress={handleSubmit}
        loading={submitting}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  stars: { flexDirection: 'row', gap: spacing.xs },
  commentInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 100,
  },
});
