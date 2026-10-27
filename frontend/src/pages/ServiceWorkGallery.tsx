import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import api from '../api/client'
import { getUploadUrl } from '../utils/uploadUrl'
import { BeforeAfterSlider } from '../components/BeforeAfterSlider'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

type Service = {
  id: string
  name: string
  shortDescription?: string | null
  durationMinutes: number
}

type BeforeAfterPair = {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

const PAGE_SIZE = 18

export default function ServiceWorkGallery() {
  const { t, i18n } = useTranslation()
  const { serviceId } = useParams()
  const id = useMemo(() => (serviceId ?? '').trim(), [serviceId])

  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)
  const [serviceLoadError, setServiceLoadError] = useState(false)

  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [pairsLoadError, setPairsLoadError] = useState(false)
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadService = useCallback(async () => {
    if (!id) {
      setService(null)
      setLoadingService(false)
      return
    }
    setLoadingService(true)
    setServiceLoadError(false)
    try {
      const { data } = await api.get<Service>(`/api/services/admin/services/${id}`)
      setService(data)
    } catch {
      setService(null)
      setServiceLoadError(true)
    } finally {
      setLoadingService(false)
    }
  }, [id])

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!id) return
      setPairsLoadError(false)
      if (nextOffset === 0) setLoadingPairs(true)
      else setLoadingMore(true)
      try {
        const { data } = await api.get<{
          items: BeforeAfterPair[]
          hasMore: boolean
          nextOffset: number
        }>('/api/daily-log/before-after', {
          params: { serviceId: id, limit: PAGE_SIZE, offset: nextOffset },
        })
        const list = Array.isArray(data?.items) ? data.items : []
        setItems((prev) => (append ? [...prev, ...list] : list))
        setHasMore(data?.hasMore ?? false)
        setOffset(data?.nextOffset ?? nextOffset + list.length)
      } catch {
        setPairsLoadError(true)
        setHasMore(false)
      } finally {
        setLoadingPairs(false)
        setLoadingMore(false)
      }
    },
    [id],
  )

  useEffect(() => {
    void loadService()
  }, [loadService])

  useEffect(() => {
    setItems([])
    setOffset(0)
    setHasMore(true)
    if (id) void loadPage(0, false)
  }, [id, loadPage])

  useEffect(() => {
    if (!hasMore || loadingMore || loadingPairs) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadPage(offset, true)
      },
      { rootMargin: '200px', threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadingPairs, offset, loadPage])

  if (loadingService) {
    return (
      <div className="flex justify-center py-14 text-slate-500">
        <>
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          <span className="sr-only">{t('admin.serviceWorkGallery.loadingService')}</span>
        </>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {t('admin.serviceWorkGallery.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {service ? service.name : t('admin.serviceWorkGallery.serviceFallback')}
          </p>
          {service ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {new Intl.NumberFormat(i18n.language).format(service.durationMinutes)}{' '}
                {t('admin.serviceWorkGallery.minutesAbbreviation')}
              </Badge>
            </div>
          ) : null}
        </div>

        <Button asChild type="button" variant="outline">
          <RouterLink to="/admin/services">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('admin.serviceWorkGallery.back')}
          </RouterLink>
        </Button>
      </div>

      {serviceLoadError ? (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
          role="alert"
        >
          <p className="text-sm text-amber-900">
            {t('admin.serviceWorkGallery.serviceLoadFailed')}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => void loadService()}>
            {t('admin.serviceWorkGallery.retry')}
          </Button>
        </div>
      ) : null}

      {loadingPairs && items.length === 0 ? (
        <div className="flex justify-center py-14 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          <span className="sr-only">{t('admin.serviceWorkGallery.loadingPairs')}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-sm text-center text-slate-500">
          {pairsLoadError ? (
            <div role="alert">
              <p>{t('admin.serviceWorkGallery.pairsLoadFailed')}</p>
              <Button variant="outline" className="mt-3" onClick={() => void loadPage(0, false)}>
                {t('admin.serviceWorkGallery.retry')}
              </Button>
            </div>
          ) : (
            <p>{t('admin.serviceWorkGallery.empty')}</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((pair) => (
              <Card key={pair.id} className="overflow-hidden">
                <BeforeAfterSlider
                  beforeSrc={getUploadUrl(
                    pair.before.pathMedium ?? pair.before.pathThumb ?? pair.before.pathOriginal,
                  )}
                  afterSrc={getUploadUrl(
                    pair.after.pathMedium ?? pair.after.pathThumb ?? pair.after.pathOriginal,
                  )}
                  alt={t('public.beforeAfter.comparisonLabels')}
                  aspectRatio={1}
                />
              </Card>
            ))}
          </div>
          <div ref={sentinelRef} className="h-4 mt-8" />
          {pairsLoadError ? (
            <div className="py-4 text-center" role="alert">
              <p className="text-sm text-slate-600">{t('admin.serviceWorkGallery.pairsLoadFailed')}</p>
              <Button variant="outline" className="mt-3" onClick={() => void loadPage(offset, true)}>
                {t('admin.serviceWorkGallery.retry')}
              </Button>
            </div>
          ) : null}
          {loadingMore ? (
            <div className="flex justify-center py-8 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
