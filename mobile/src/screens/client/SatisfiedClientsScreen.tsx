import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import { normalizeBeforeAfterPage } from '../../utils/apiPayload';
import type { HomeScreenProps } from '../../navigation/types';

interface BeforeAfterPair {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

const PAGE_SIZE = 10;

export function SatisfiedClientsScreen({}: HomeScreenProps<'SatisfiedClients'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const sliderSize = width - spacing.md * 2;
  const [items, setItems] = useState<BeforeAfterPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestGeneration = useRef(0);

  const loadPage = useCallback(async (nextOffset: number, append: boolean, generation = requestGeneration.current) => {
    if (nextOffset === 0) setLoading(true);
    else setLoadingMore(true);
    setLoadError(false);
    try {
      const { data } = await api.get<unknown>(
        '/api/daily-log/before-after',
        { params: { limit: PAGE_SIZE, offset: nextOffset } },
      );
      if (generation !== requestGeneration.current) return;
      const page = normalizeBeforeAfterPage(data);
      if (!page) {
        setLoadError(true);
        return;
      }
      setItems((prev) => (append ? [...prev, ...page.items] : page.items));
      setHasMore(page.hasMore);
      setOffset(page.nextOffset);
    } catch {
      if (generation === requestGeneration.current) setLoadError(true);
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const retryLoad = useCallback(() => {
    void loadPage(items.length === 0 ? 0 : offset, items.length > 0);
  }, [items.length, offset, loadPage]);

  const onEndReached = useCallback(() => {
    if (!loading && !loadingMore && !loadError && hasMore && items.length > 0) {
      loadPage(offset, true);
    }
  }, [loading, loadingMore, loadError, hasMore, offset, items.length, loadPage]);

  React.useEffect(() => {
    const generation = ++requestGeneration.current;
    void loadPage(0, false, generation);
    return () => {
      if (requestGeneration.current === generation) requestGeneration.current += 1;
    };
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
        {t('beforeAfterGallery.pageHint')}
      </Text>
      {loadError ? (
        <View accessibilityRole="alert" style={styles.recoveryNotice}>
          <Text style={{ color: colors.textSecondary }}>
            {t(items.length > 0 ? 'beforeAfterGallery.loadMoreError' : 'beforeAfterGallery.loadError')}
          </Text>
          <Button
            title={t('common.retry')}
            variant="outline"
            size="sm"
            loading={loading || loadingMore}
            onPress={retryLoad}
          />
        </View>
      ) : null}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.lg + tabBarBottom }]}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loadError ? (
            <EmptyState
              icon="images-outline"
              title={t('beforeAfterGallery.emptyTitle')}
              message={t('beforeAfterGallery.emptyMessage')}
            />
          ) : null
        }
        ListFooterComponent={ListFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  recoveryNotice: { alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.sm },
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
