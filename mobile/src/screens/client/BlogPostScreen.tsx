import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '../../hooks/useTheme';
import api, { getImageUrl } from '../../services/api';
import { spacing } from '../../theme';
import type { HomeScreenProps } from '../../navigation/types';
import type { BlogPost } from '../../types';

export function BlogPostScreen({ route, navigation }: HomeScreenProps<'BlogPost'>) {
  const { slug } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<BlogPost>(`/api/blog/slug/${slug}`);
        setPost(data);
        navigation.setOptions({ title: data.title });
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [slug, navigation]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Članak nije pronađen</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom + 8 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {post.heroImage && (
        <Image
          source={{ uri: getImageUrl(post.heroImage) }}
          style={[styles.hero, { width }]}
          contentFit="cover"
        />
      )}

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString('bs-BA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : ''}
          {post.author && ` · ${post.author.firstName} ${post.author.lastName}`}
        </Text>

        <Text style={[styles.contentText, { color: colors.text }]} selectable>
          {post.content.replace(/<[^>]+>/g, '')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {},
  hero: { height: 220, borderCurve: 'continuous' },
  body: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  date: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.lg },
  contentText: { fontSize: 16, lineHeight: 26 },
});
