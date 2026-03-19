import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import api from '../../services/api';
import { spacing, borderRadius } from '../../theme';
import type { ReservationsScreenProps } from '../../navigation/types';
import type { Service } from '../../types';

function StarRating({ rating, onRate, size = 32 }: { rating: number; onRate: (r: number) => void; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onRate(star)}>
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
  const insets = useSafeAreaInsets();

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState(serviceId || '');
  const [serviceRating, setServiceRating] = useState(0);
  const [stylistRating, setStylistRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!serviceId);

  useEffect(() => {
    if (!serviceId) {
      (async () => {
        try {
          const { data } = await api.get<Service[]>('/api/services', { params: { activeOnly: true } });
          setServices(data);
        } catch { /* silent */ }
        setLoading(false);
      })();
    }
  }, [serviceId]);

  const handleSubmit = async () => {
    if (!selectedServiceId) {
      Alert.alert(t('common.error'), t('reviews.selectService'));
      return;
    }
    if (serviceRating === 0) {
      Alert.alert(t('common.error'), 'Molimo ocijenite uslugu');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/reviews', {
        serviceId: selectedServiceId,
        reservationId: reservationId || undefined,
        serviceRating,
        stylistRating: stylistRating || undefined,
        comment: comment.trim() || undefined,
      });
      Alert.alert(t('reviews.reviewSuccess'), t('reviews.reviewSuccessMessage'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || 'Greška');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom + 8 }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {!serviceId && services.length > 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('reviews.selectService')}
          </Text>
          {services.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSelectedServiceId(s.id)}
              style={[
                styles.serviceOption,
                {
                  backgroundColor:
                    selectedServiceId === s.id ? colors.accent : colors.surface,
                  borderColor:
                    selectedServiceId === s.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.serviceOptionText,
                  { color: selectedServiceId === s.id ? colors.primary : colors.text },
                ]}
              >
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('reviews.serviceRating')}
        </Text>
        <StarRating rating={serviceRating} onRate={setServiceRating} />
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('reviews.stylistRating')}
        </Text>
        <StarRating rating={stylistRating} onRate={setStylistRating} size={28} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  stars: { flexDirection: 'row', gap: spacing.xs },
  serviceOption: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  serviceOptionText: { fontSize: 15, fontWeight: '500' },
  commentInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 100,
  },
});
