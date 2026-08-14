import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Share,
  TextInput,
  Alert,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { MediaImage } from '../../components/MediaImage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../../hooks/useTheme';
import api, { getImageUrl } from '../../services/api';
import { fetchPublicSettings, type PublicSettingItem } from '../../services/publicSettings';
import { usePublicContentSocketRefresh } from '../../hooks/usePublicContentSocketRefresh';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';
import type { HomeScreenProps } from '../../navigation/types';
import type { BlogPost } from '../../types';

type BlogComment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
};

function getSettingValue(
  settings: PublicSettingItem[] | null | undefined,
  key: string,
  fallback: string,
): string {
  const value = settings?.find((x) => x.key === key)?.value;
  return typeof value === 'string' ? value : fallback;
}

export function BlogPostScreen({ route, navigation }: HomeScreenProps<'BlogPost'>) {
  const { slug } = route.params;
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState<PublicSettingItem[] | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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

  const loadPublicSettings = useCallback(() => {
    fetchPublicSettings()
      .then((items) => setSettings(items))
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    loadPublicSettings();
  }, [loadPublicSettings]);

  usePublicContentSocketRefresh(loadPublicSettings);

  useEffect(() => {
    if (!post?.id) return;
    (async () => {
      setCommentsLoading(true);
      try {
        const { data } = await api.get<BlogComment[]>(`/api/blog/${post.id}/comments`, {
          params: { approved: true },
        });
        setComments(Array.isArray(data) ? data : []);
      } catch {
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    })();
  }, [post?.id]);

  const handleShare = async () => {
    if (!post) return;
    const baseFromSettings = getSettingValue(settings, 'public_site_base_url', '').trim();
    const baseFromExtra = (Constants.expoConfig as any)?.extra?.publicSiteBaseUrl ?? '';
    const baseFromEnv = (process.env.EXPO_PUBLIC_SITE_BASE_URL ?? '').trim();

    const base = (baseFromSettings || baseFromExtra || baseFromEnv)
      .trim()
      .replace(/\/+$/, '');
    const url = base ? `${base}/blog/${post.slug}` : '';
    try {
      await Share.share({
        message: url ? `${post.title}\n${url}` : post.title,
        url: url || undefined,
        title: post.title,
      });
    } catch {
      // ignore
    }
  };

  const reloadApprovedComments = async (postId: string) => {
    setCommentsLoading(true);
    try {
      const { data } = await api.get<BlogComment[]>(`/api/blog/${postId}/comments`, {
        params: { approved: true },
      });
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      Alert.alert('Prijava', 'Prijavite se da biste komentarisali.');
      return;
    }
    if (!post?.id || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/api/blog/${post.id}/comments`, { content: newComment.trim() });
      setNewComment('');
      Alert.alert('Hvala!', 'Komentar je poslan na odobrenje.');
      await reloadApprovedComments(post.id);
    } catch {
      Alert.alert('Greška', 'Greška pri slanju komentara.');
    } finally {
      setSubmittingComment(false);
    }
  };

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
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <MediaImage
          uri={getImageUrl(post.heroImage)}
          style={[styles.hero, { width }]}
        />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
          <Button
            title=""
            variant="ghost"
            size="sm"
            onPress={handleShare}
            icon={<Ionicons name="share-outline" size={18} color={colors.primary} />}
          />
        </View>
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

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.commentsHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.commentsTitle, { color: colors.text }]}>
            Komentari{comments.length ? ` (${comments.length})` : ''}
          </Text>
        </View>

        <Card style={styles.commentComposer}>
          <TextInput
            style={[
              styles.commentInput,
              {
                color: colors.inputText,
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
              },
            ]}
            placeholder={user ? 'Napišite komentar…' : 'Prijavite se da biste komentarisali…'}
            placeholderTextColor={colors.inputPlaceholder}
            editable={!!user && !submittingComment}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={2000}
          />
          <Button
            title={submittingComment ? 'Slanje…' : 'Pošalji'}
            onPress={handleSubmitComment}
            disabled={!user || submittingComment || !newComment.trim()}
            size="sm"
          />
        </Card>

        {commentsLoading ? (
          <View style={{ paddingVertical: spacing.md }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>
            Nema odobrenih komentara.
          </Text>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {comments.map((c) => (
              <Card key={c.id} style={styles.commentCard}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {c.user.firstName} {c.user.lastName}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {new Date(c.createdAt).toLocaleString('bs-BA')}
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>
                  {c.content}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {},
  hero: { height: 220, borderCurve: 'continuous' },
  body: { padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32, flex: 1 },
  date: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.lg },
  contentText: { fontSize: 16, lineHeight: 26 },
  divider: { height: 1, marginTop: spacing.xl, marginBottom: spacing.lg, opacity: 0.75 },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  commentsTitle: { fontSize: 16, fontWeight: '700' },
  commentComposer: { gap: spacing.sm },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 92,
    textAlignVertical: 'top',
  },
  commentCard: {},
});
