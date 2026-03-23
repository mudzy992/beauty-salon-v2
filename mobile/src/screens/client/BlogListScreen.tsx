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
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import api, { getImageUrl } from '../../services/api';
import { spacing, borderRadius } from '../../theme';
import type { HomeScreenProps } from '../../navigation/types';
import type { BlogPost } from '../../types';

export function BlogListScreen({ navigation }: HomeScreenProps<'BlogList'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await api.get<BlogPost[]>('/api/blog', { params: { published: true } });
      setPosts(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  if (loading) {
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
      ListEmptyComponent={
        <EmptyState icon="newspaper-outline" title={t('blog.noPosts')} />
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInUp.delay(Math.min(index, 10) * 55).duration(340).springify()}>
        <Card
          onPress={() => navigation.navigate('BlogPost', { slug: item.slug })}
          style={styles.card}
          padded={false}
        >
          {item.heroImage && (
            <Image
              source={{ uri: getImageUrl(item.heroImage) }}
              style={styles.heroImage}
              contentFit="cover"
            />
          )}
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
            <Text style={[styles.readMore, { color: colors.primary }]}>
              {t('blog.readMore')}
            </Text>
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
  card: { marginBottom: spacing.md, overflow: 'hidden' },
  heroImage: {
    width: '100%',
    height: 180,
  },
  cardContent: { padding: spacing.md },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  date: { fontSize: 13, marginTop: spacing.xs },
  readMore: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
});
