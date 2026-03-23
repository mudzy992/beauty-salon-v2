import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import type { ServicesScreenProps } from '../../navigation/types';
import type { ServiceCategory } from '../../types';

export function ServicesScreen({ navigation }: ServicesScreenProps<'Services'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get<ServiceCategory[]>('/api/services/categories', {
        params: { activeOnly: true },
      });
      setCategories(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  }, [fetchCategories]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.list,
        categories.length === 0 && styles.emptyList,
        { paddingBottom: spacing.lg + tabBarBottom },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <EmptyState
          icon="cut-outline"
          title={t('services.noServices')}
        />
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 50).duration(320).springify()}>
          <Card
            onPress={() =>
              navigation.navigate('ServiceDetail', {
                categoryId: item.id,
                categoryName: item.name,
              })
            }
            style={styles.card}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
                <Ionicons name="cut" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {item.name}
                </Text>
                {item.description && (
                  <Text
                    style={[styles.categoryDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  card: { marginBottom: spacing.sm },
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
