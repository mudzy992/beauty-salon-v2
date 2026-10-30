import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  ListRenderItem,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar'
import api, { getUploadUrl } from '../../services/api'
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { spacing } from '../../theme'
import type { ServicesScreenProps } from '../../navigation/types'
import { fontFamily } from '../../theme/fonts'
import { normalizeBeforeAfterPage } from '../../utils/apiPayload'

type BeforeAfterPair = {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  service?: { id: string; name: string }
  completedAt?: string | null
}

const PAGE_SIZE = 10

export function ServiceWorkGalleryScreen({
  route,
  navigation,
}: ServicesScreenProps<'ServiceWorkGallery'>) {
  const { serviceId, serviceName } = route.params
  const { colors } = useTheme()
  const tabBarBottom = useFloatingTabBarTotalHeight()
  const { width } = useWindowDimensions()
  const sliderSize = width - spacing.md * 2

  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const requestGeneration = useRef(0)

  const title = useMemo(() => serviceName?.trim() || 'Galerija', [serviceName])

  useEffect(() => {
    navigation.setOptions({ title })
  }, [navigation, title])

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean, generation = requestGeneration.current) => {
      if (nextOffset === 0) setLoading(true)
      else setLoadingMore(true)
      try {
        const { data } = await api.get<unknown>('/api/daily-log/before-after', {
          params: { serviceId, limit: PAGE_SIZE, offset: nextOffset },
        })
        if (generation !== requestGeneration.current) return
        const page = normalizeBeforeAfterPage(data)
        if (!page) {
          setHasMore(false)
          return
        }
        setItems((prev) => (append ? [...prev, ...page.items] : page.items))
        setHasMore(page.hasMore)
        setOffset(page.nextOffset)
      } catch {
        if (generation === requestGeneration.current) setHasMore(false)
      } finally {
        if (generation === requestGeneration.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [serviceId],
  )

  useEffect(() => {
    const generation = ++requestGeneration.current
    setItems([])
    setOffset(0)
    setHasMore(true)
    void loadPage(0, false, generation)
    return () => {
      if (requestGeneration.current === generation) requestGeneration.current += 1
    }
  }, [serviceId, loadPage])

  const onEndReached = useCallback(() => {
    if (!loading && !loadingMore && hasMore && items.length > 0) {
      void loadPage(offset, true)
    }
  }, [loading, loadingMore, hasMore, offset, items.length, loadPage])

  const renderItem: ListRenderItem<BeforeAfterPair> = useCallback(
    ({ item }) => (
      <Card style={[styles.card, { borderColor: colors.border, borderWidth: 1 }]}>
        <BeforeAfterSlider
          beforeSrc={getUploadUrl(item.before.pathMedium ?? item.before.pathThumb ?? item.before.pathOriginal)}
          afterSrc={getUploadUrl(item.after.pathMedium ?? item.after.pathThumb ?? item.after.pathOriginal)}
          width={sliderSize}
          height={sliderSize}
        />
      </Card>
    ),
    [colors.border, sliderSize],
  )

  const keyExtractor = useCallback((item: BeforeAfterPair) => item.id, [])

  if (loading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
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
          <EmptyState
            icon="images-outline"
            title="Nema transformacija"
            message="Kada budu dostupne, pojaviće se ovdje."
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  )
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
  card: { marginBottom: spacing.lg, padding: spacing.md },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
})

