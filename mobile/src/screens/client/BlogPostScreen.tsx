import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
import { useTranslation } from 'react-i18next';
import api, { getImageUrl } from '../../services/api';
import { fetchPublicSettings, type PublicSettingItem } from '../../services/publicSettings';
import { usePublicContentSocketRefresh } from '../../hooks/usePublicContentSocketRefresh';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing } from '../../theme';
import type { HomeScreenProps } from '../../navigation/types';
import { normalizeBlogCommentPage, normalizeBlogPost, type BlogComment } from '../../utils/apiPayload';

const COMMENT_PAGE_SIZE = 20;

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
  const { t } = useTranslation();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [postState, setPostState] = useState<{ slug: string; post: NonNullable<ReturnType<typeof normalizeBlogPost>> } | null>(null);
  const post = postState?.slug === slug ? postState.post : null;
  const [loading, setLoading] = useState(true);
  const [postErrorSlug, setPostErrorSlug] = useState<string | null>(null);
  const [postNotFoundSlug, setPostNotFoundSlug] = useState<string | null>(null);
  const postLoadError = postErrorSlug === slug;
  const postNotFound = postNotFoundSlug === slug;
  const postRequestGeneration = useRef(0);
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState<PublicSettingItem[] | null>(null);
  const [commentsState, setCommentsState] = useState<{
    postId: string; items: BlogComment[]; total: number;
    hasMore: boolean; nextOffset: number;
  } | null>(null);
  const comments = commentsState && commentsState.postId === post?.id ? commentsState.items : [];
  const commentsTotal = commentsState && commentsState.postId === post?.id ? commentsState.total : 0;
  const commentsHasMore = commentsState && commentsState.postId === post?.id ? commentsState.hasMore : false;
  const commentsNextOffset = commentsState && commentsState.postId === post?.id ? commentsState.nextOffset : 0;
  const [commentsErrorPostId, setCommentsErrorPostId] = useState<string | null>(null);
  const commentRequestGeneration = useRef(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPost = useCallback(async (requestedSlug: string) => {
    const generation = ++postRequestGeneration.current;
    setLoading(true);
    setPostErrorSlug(null);
    setPostNotFoundSlug(null);
    try {
      const { data } = await api.get<unknown>(`/api/blog/slug/${requestedSlug}`);
      const normalized = normalizeBlogPost(data);
      if (!normalized || normalized.slug !== requestedSlug) throw new Error();
      if (generation !== postRequestGeneration.current) return;
      if (!normalized.isPublished) {
        setPostState((current) => current?.slug === requestedSlug ? null : current);
        setPostNotFoundSlug(requestedSlug);
        return;
      }
      setPostState({ slug: requestedSlug, post: normalized });
      navigation.setOptions({ title: normalized.title });
    } catch (error: unknown) {
      if (generation === postRequestGeneration.current) {
        const status = typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: unknown } }).response?.status
          : undefined;
        if (status === 404) {
          setPostState((current) => current?.slug === requestedSlug ? null : current);
          setPostNotFoundSlug(requestedSlug);
        } else setPostErrorSlug(requestedSlug);
      }
    } finally {
      if (generation === postRequestGeneration.current) setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    void fetchPost(slug);
    return () => { postRequestGeneration.current += 1; };
  }, [fetchPost, slug]);

  const loadPublicSettings = useCallback(() => {
    fetchPublicSettings()
      .then((items) => setSettings(items))
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    loadPublicSettings();
  }, [loadPublicSettings]);

  usePublicContentSocketRefresh(loadPublicSettings);

  const loadPublicComments = useCallback(async (postId: string, offset = 0, append = false) => {
    const generation = ++commentRequestGeneration.current;
    if (append) setCommentsLoadingMore(true);
    else setCommentsLoading(true);
    setCommentsErrorPostId(null);
    try {
      const { data } = await api.get<unknown>(
        `/api/blog/${postId}/comments`,
        { params: { limit: COMMENT_PAGE_SIZE, offset } },
      );
      const page = normalizeBlogCommentPage(data, COMMENT_PAGE_SIZE, offset);
      if (!page) throw new Error();
      if (generation !== commentRequestGeneration.current) return;
      setCommentsState((current) => ({
        postId,
        items: append && current?.postId === postId ? [...current.items, ...page.items] : page.items,
        total: page.total,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      }));
    } catch {
      if (generation === commentRequestGeneration.current) setCommentsErrorPostId(postId);
    } finally {
      if (generation === commentRequestGeneration.current) {
        setCommentsLoading(false);
        setCommentsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!post?.id) return;
    void loadPublicComments(post.id, 0, false);
    return () => { commentRequestGeneration.current += 1; };
  }, [loadPublicComments, post?.id]);

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
    await loadPublicComments(postId, 0, false);
  };

  const handleSubmitComment = async () => {
    if (!user) {
      Alert.alert(t('blog.loginRequiredTitle'), t('blog.commentLoginRequiredMessage'));
      return;
    }
    if (!post?.id || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/api/blog/${post.id}/comments`, { content: newComment.trim() });
      setNewComment('');
      Alert.alert(t('blog.commentSuccessTitle'), t('blog.commentSuccessMessage'));
      await reloadApprovedComments(post.id);
    } catch {
      Alert.alert(t('blog.commentErrorTitle'), t('blog.commentErrorMessage'));
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!post && !postLoadError && !postNotFound) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, styles.loadError, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="cloud-offline-outline"
          title={postLoadError ? t('blog.postLoadErrorTitle') : t('blog.postNotFound')}
          message={postLoadError ? t('blog.postLoadErrorMessage') : undefined}
          actionLabel={postLoadError ? t('common.retry') : undefined}
          onAction={postLoadError ? () => void fetchPost(slug) : undefined}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void fetchPost(slug)} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <MediaImage
          uri={getImageUrl(post.heroImage)}
          style={[styles.hero, { width }]}
        />

      <View style={styles.body}>
        {postLoadError ? (
          <Card style={[styles.errorCard, { borderColor: colors.border }]}>
            <View style={styles.errorCopy}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>{t('blog.postLoadErrorTitle')}</Text>
              <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{t('blog.postStaleMessage')}</Text>
            </View>
            <Button title={t('common.retry')} onPress={() => void fetchPost(slug)} variant="outline" size="sm" />
          </Card>
        ) : null}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
          <Button
            title={t('blog.share')}
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
          {(post.content ?? '').replace(/<[^>]+>/g, '')}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.commentsHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.commentsTitle, { color: colors.text }]}>
            {t('blog.commentsTitle')}{commentsTotal ? ` (${commentsTotal})` : ''}
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
            placeholder={user ? t('blog.commentPlaceholder') : t('blog.commentLoginPlaceholder')}
            placeholderTextColor={colors.inputPlaceholder}
            editable={!!user && !submittingComment}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={2000}
          />
          <Button
            title={submittingComment ? t('blog.commentSending') : t('blog.commentSubmit')}
            onPress={handleSubmitComment}
            disabled={!user || submittingComment || !newComment.trim()}
            size="sm"
          />
        </Card>

        {commentsErrorPostId === post.id ? (
          <Card style={[styles.errorCard, { borderColor: colors.border }]}>
            <View style={styles.errorCopy}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>{t('blog.commentsLoadErrorTitle')}</Text>
              <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
                {comments.length > 0 ? t('blog.commentsStaleMessage') : t('blog.commentsLoadErrorMessage')}
              </Text>
            </View>
            <Button
              title={t('common.retry')}
              onPress={() => void loadPublicComments(post.id, 0, false)}
              variant="outline"
              size="sm"
            />
          </Card>
        ) : null}
        {commentsLoading ? (
          <View style={{ paddingVertical: spacing.md }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : commentsErrorPostId === post.id ? null : comments.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>
            {t('blog.noApprovedComments')}
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
        {commentsHasMore ? (
          <Button
            title={t('blog.loadMoreComments')}
            onPress={() => void loadPublicComments(post.id, commentsNextOffset, true)}
            disabled={commentsLoadingMore}
            loading={commentsLoadingMore}
            variant="outline"
            style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadError: { padding: spacing.lg },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorCopy: { flex: 1, gap: 4 },
  errorTitle: { fontWeight: '700' },
  errorMessage: { fontSize: 13, lineHeight: 18 },
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
