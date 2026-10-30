import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { MediaImage } from '../../components/MediaImage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import api, { getImageUrl } from '../../services/api';
import { spacing } from '../../theme';
import type { HomeScreenProps } from '../../navigation/types';
import type { BlogPost } from '../../types';
import { normalizeBlogPage } from '../../utils/apiPayload';

const PAGE_SIZE = 20;

export function BlogListScreen({ navigation }: HomeScreenProps<'BlogList'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const requestGeneration = useRef(0);

  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    const generation = ++requestGeneration.current;
    if (append) setLoadingMore(true);
    else if (offset === 0) setLoading(true);
    try {
      const { data } = await api.get<unknown>('/api/blog', {
        params: { limit: PAGE_SIZE, offset },
      });
      if (generation !== requestGeneration.current) return;
      const page = normalizeBlogPage(data, PAGE_SIZE, offset);
      if (!page) {
        setLoadError(true);
        return;
      }
      setPosts((current) => (append ? [...current, ...page.items] : page.items));
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
      setLoadError(false);
    } catch {
      if (generation === requestGeneration.current) setLoadError(true);
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchPosts(0, false);
    return () => {
      requestGeneration.current += 1;
    };
  }, [fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPosts(0, false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    void fetchPosts(nextOffset, true);
  }, [fetchPosts, hasMore, loading, loadingMore, nextOffset]);

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.list,
        posts.length === 0 && styles.emptyList,
        { paddingBottom: tabBarBottom },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={loadingMore ? (
        <ActivityIndicator style={styles.footer} color={colors.primary} />
      ) : hasMore ? (
        <Button title="Učitaj još" onPress={loadMore} variant="outline" style={styles.footer} />
      ) : null}
      ListHeaderComponent={loadError && posts.length > 0 ? (
        <Card style={[styles.card, { borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('blog.loadErrorTitle')}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{t('blog.staleMessage')}</Text>
          <Button title={t('common.retry')} onPress={() => void fetchPosts(0, false)} variant="outline" size="sm" style={{ marginTop: spacing.sm }} />
        </Card>
      ) : null}
      ListEmptyComponent={
        loadError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t('blog.loadErrorTitle')}
            message={t('blog.loadErrorMessage')}
            actionLabel={t('common.retry')}
            onAction={() => void fetchPosts(0, false)}
          />
        ) : <EmptyState icon="newspaper-outline" title={t('blog.noPosts')} />
      }
      renderItem={({ item }) => (
        <View>
          <Card
            onPress={() => navigation.navigate('BlogPost', { slug: item.slug })}
            style={styles.card}
            padded={false}
          >
            <MediaImage
              uri={getImageUrl(item.heroImage)}
              style={styles.heroImage}
            />
            <View style={styles.cardContent}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString('bs-BA', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : ''}
              </Text>
              {item.excerpt ? (
                <Text style={[styles.excerpt, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.excerpt}
                </Text>
              ) : null}
              <Text style={[styles.readMore, { color: colors.primary }]}>
                {t('blog.readMore')}
              </Text>
            </View>
          </Card>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  card: { marginBottom: spacing.md, overflow: 'hidden' },
  heroImage: {
    width: '100%',
    height: 180,
  },
  cardContent: { padding: spacing.md },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  date: { fontSize: 13, marginTop: spacing.xs },
  excerpt: { fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  readMore: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  footer: { marginTop: spacing.md, alignSelf: 'center' },
});
