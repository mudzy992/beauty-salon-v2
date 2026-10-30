import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  ListRenderItem,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';
import api, { getUploadUrl } from '../../services/api';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import { normalizeBeforeAfterPairs } from '../../utils/apiPayload';
import type { HomeScreenProps } from '../../navigation/types';

interface BeforeAfterPair {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

const PAGE_SIZE = 10;

export function SatisfiedClientsScreen({}: HomeScreenProps<'SatisfiedClients'>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const sliderSize = width - spacing.md * 2;
  const [items, setItems] = useState<BeforeAfterPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (nextOffset: number, append: boolean) => {
    if (nextOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data } = await api.get<{ items: BeforeAfterPair[]; hasMore: boolean; nextOffset: number }>(
        '/api/daily-log/before-after',
        { params: { limit: PAGE_SIZE, offset: nextOffset } },
      );
      const list = normalizeBeforeAfterPairs(data?.items) ?? [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      setHasMore(data.hasMore ?? false);
      setOffset(data.nextOffset ?? nextOffset + list.length);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const onEndReached = useCallback(() => {
    if (!loading && !loadingMore && hasMore && items.length > 0) {
      loadPage(offset, true);
    }
  }, [loading, loadingMore, hasMore, offset, items.length, loadPage]);

  React.useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const renderItem: ListRenderItem<BeforeAfterPair> = useCallback(
    ({ item }) => (
      <View style={styles.card}>
        <BeforeAfterSlider
          beforeSrc={getUploadUrl(item.before.pathMedium ?? item.before.pathThumb ?? item.before.pathOriginal)}
          afterSrc={getUploadUrl(item.after.pathMedium ?? item.after.pathThumb ?? item.after.pathOriginal)}
          width={sliderSize}
          height={sliderSize}
        />
      </View>
    ),
    [sliderSize],
  );

  const keyExtractor = useCallback((item: BeforeAfterPair) => item.id, []);

  const ListFooter = useCallback(
    () =>
      loadingMore ? (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null,
    [loadingMore, colors.primary],
  );

  if (loading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Povucite sliku lijevo ili desno za prije / poslije
      </Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.lg + tabBarBottom }]}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyState icon="images-outline" title="Nema transformacija" message="Kada budu dostupne, pojaviće se ovdje." />
        }
        ListFooterComponent={ListFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: {
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    fontFamily: fontFamily.body,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.lg },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: spacing.xxl, fontSize: 15 },
});
