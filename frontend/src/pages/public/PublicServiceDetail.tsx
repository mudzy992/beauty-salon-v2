import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Info } from 'lucide-react'
import api from '../../api/client'
import { MediaImage } from '../../components/media-image'
import { cssBackgroundImage, MEDIA_FALLBACK_SRC } from '../../constants/media-fallback'
import { getUploadUrl } from '../../utils/uploadUrl'
import { BeforeAfterSpotlight } from '../../features/shell/public/before-after-spotlight'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { useSettings } from '../../context/SettingsContext'
import { Seo } from '../../seo/Seo'
import { site } from '../../seo/site'

type Service = {
  id: string
  name: string
  shortDescription?: string | null
  heroImage?: string | null
  durationMinutes: number
}

type BeforeAfterPair = {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

const PAGE_SIZE = 12

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isOptionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === 'string'

const isServiceResponse = (value: unknown, expectedId: string): value is Service =>
  isRecord(value) &&
  value.id === expectedId &&
  typeof value.name === 'string' &&
  typeof value.durationMinutes === 'number' &&
  isOptionalString(value.shortDescription) &&
  isOptionalString(value.heroImage)

const isImageAsset = (
  value: unknown,
): value is { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null } =>
  isRecord(value) &&
  typeof value.pathOriginal === 'string' &&
  isOptionalString(value.pathMedium) &&
  isOptionalString(value.pathThumb)

const isBeforeAfterPair = (value: unknown): value is BeforeAfterPair =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  isImageAsset(value.before) &&
  isImageAsset(value.after)

export default function PublicServiceDetail() {
  const { serviceId } = useParams()
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)
  const [serviceLoadError, setServiceLoadError] = useState(false)
  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pairsLoadError, setPairsLoadError] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const serviceRequestIdRef = useRef(0)
  const galleryRequestIdRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const id = useMemo(() => (serviceId ?? '').trim(), [serviceId])

  const loadService = useCallback(async () => {
    if (!id) {
      serviceRequestIdRef.current += 1
      setService(null)
      setServiceLoadError(false)
      setLoadingService(false)
      return
    }
    const requestId = ++serviceRequestIdRef.current
    setLoadingService(true)
    setServiceLoadError(false)
    try {
      const { data } = await api.get<Service>(`/api/services/${encodeURIComponent(id)}`)
      if (!isServiceResponse(data, id)) throw new Error('Invalid public service response')
      if (requestId === serviceRequestIdRef.current) setService(data)
    } catch (error) {
      if (requestId === serviceRequestIdRef.current) {
        setService(null)
        setServiceLoadError(!(axios.isAxiosError(error) && error.response?.status === 404))
      }
    } finally {
      if (requestId === serviceRequestIdRef.current) setLoadingService(false)
    }
  }, [id])

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!id) return
      const requestId = ++galleryRequestIdRef.current
      if (nextOffset === 0) setLoadingPairs(true)
      else setLoadingMore(true)
      setPairsLoadError(false)
      try {
        const { data } = await api.get<{
          items: BeforeAfterPair[]
          hasMore: boolean
          nextOffset: number
        }>('/api/daily-log/before-after', {
          params: { serviceId: id, limit: PAGE_SIZE, offset: nextOffset },
        })
        if (
          !Array.isArray(data?.items) ||
          !data.items.every(isBeforeAfterPair) ||
          (data.hasMore != null && typeof data.hasMore !== 'boolean') ||
          (data.nextOffset != null &&
            (typeof data.nextOffset !== 'number' ||
              !Number.isSafeInteger(data.nextOffset) ||
              data.nextOffset < 0))
        ) {
          throw new Error('Invalid before-and-after response')
        }
        const list = data.items
        const nextPageHasMore = data.hasMore ?? false
        const nextPageOffset = data.nextOffset ?? nextOffset + list.length
        if (nextPageHasMore && nextPageOffset <= nextOffset) {
          throw new Error('Invalid before-and-after pagination offset')
        }
        if (requestId === galleryRequestIdRef.current) {
          setItems((prev) => (append ? [...prev, ...list] : list))
          setHasMore(nextPageHasMore)
          setOffset(nextPageOffset)
        }
      } catch {
        if (requestId === galleryRequestIdRef.current) {
          setHasMore(false)
          setPairsLoadError(true)
        }
      } finally {
        if (requestId === galleryRequestIdRef.current) {
          setLoadingPairs(false)
          setLoadingMore(false)
        }
      }
    },
    [id],
  )

  useEffect(() => {
    void loadService()
    return () => {
      serviceRequestIdRef.current += 1
    }
  }, [loadService])

  useEffect(() => {
    setItems([])
    setOffset(0)
    setHasMore(true)
    setPairsLoadError(false)
    if (id) void loadPage(0, false)
    return () => {
      galleryRequestIdRef.current += 1
    }
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
      <div role="status" aria-live="polite" className="py-16 text-center text-slate-600">
        {t('public.serviceDetail.loading')}
      </div>
    )
  }

  if (serviceLoadError) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center" role="alert">
          <p className="text-slate-600 mb-4">{t('public.serviceDetail.loadFailed')}</p>
          <Button variant="outline" onClick={() => void loadService()}>
            {t('public.serviceDetail.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            {t('public.serviceDetail.notFound')}
          </div>
          <div className="text-slate-600 mb-6">
            {t('public.serviceDetail.notFoundHint')}
          </div>
          <Link to="/usluge">
            <Button variant="outline">{t('public.serviceDetail.backToServices')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  const hasServiceHeroImage = Boolean(service.heroImage?.trim())
  const detailHeroBg = hasServiceHeroImage
    ? getUploadUrl(service.heroImage as string)
    : getSetting('public_services_bg', '')
  const heroImageAlt = t('public.serviceDetail.imageAlt', { service: service.name })

  const canonicalPath = `/usluge/${service.id}`
  const description =
    service.shortDescription?.trim() ||
    t('public.serviceDetail.descriptionFallback')
  const ogImage = hasServiceHeroImage ? detailHeroBg : site.defaultOgImagePath
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description,
    provider: {
      '@type': 'LocalBusiness',
      name: site.siteName,
      url: site.baseUrl,
    },
    url: `${site.baseUrl}${canonicalPath}`,
    image: ogImage
      ? ogImage.startsWith('http')
        ? ogImage
        : `${site.baseUrl}${ogImage}`
      : undefined,
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      <Seo
        title={service.name}
        description={description}
        canonicalUrl={canonicalPath}
        og={{ image: ogImage }}
        twitter={{ image: ogImage }}
        jsonLd={jsonLd}
      />
      <div className={`${publicPageHero.section} relative overflow-hidden`}>
        <div
          className={
            hasServiceHeroImage
              ? 'pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.16] sm:opacity-[0.14]'
              : 'pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.09]'
          }
          style={{ backgroundImage: cssBackgroundImage(detailHeroBg) }}
        />
        <div
          className={
            hasServiceHeroImage
              ? 'pointer-events-none absolute inset-0 bg-gradient-to-b from-white/93 via-white/86 to-white'
              : 'pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/88 to-white'
          }
        />
        <div className={`${publicPageHero.inner} relative z-[1]`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 md:gap-10">
            <div className="min-w-0 flex-1">
              <div className={publicHeader.kicker}>{t('public.serviceDetail.kicker')}</div>
              <h1 className={`${publicHeader.title} mt-2`}>{service.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {service.durationMinutes} min
                </span>
              </div>
              {service.shortDescription ? (
                <p className={`${publicHeader.subtitle} mt-4 max-w-2xl`}>
                  {service.shortDescription}
                </p>
              ) : null}
            </div>
            <div className="flex w-full shrink-0 flex-col gap-5 md:max-w-[min(100%,15rem)] lg:max-w-[min(100%,20rem)] xl:max-w-[min(100%,26.25rem)]">
              <div className="relative w-full max-w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_40px_-12px_rgba(15,23,42,0.12)] aspect-[4/3] sm:aspect-[16/10] md:aspect-[4/3]">
                  <MediaImage
                    src={hasServiceHeroImage ? detailHeroBg : MEDIA_FALLBACK_SRC}
                    alt={heroImageAlt}
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.04] rounded-2xl"
                    aria-hidden
                  />
                </div>
              <div className="flex flex-wrap gap-3">
                <Link to={`/rezervacija?serviceId=${encodeURIComponent(service.id)}`}>
                  <Button className="px-6">
                    {t('public.serviceDetail.book')}
                  </Button>
                </Link>
                <Link to="/usluge">
                  <Button variant="outline" className="px-6">
                    {t('public.serviceDetail.allServices')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        {loadingPairs && items.length === 0 ? (
          <div role="status" aria-live="polite" className="py-14 text-center text-slate-600">
            {t('public.serviceDetail.loadingGallery')}
          </div>
        ) : pairsLoadError && items.length === 0 ? (
          <div className="py-14 text-center" role="alert">
            <p className="text-slate-600">{t('public.serviceDetail.galleryLoadFailed')}</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadPage(0, false)}>
              {t('public.serviceDetail.retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/80 shadow-soft">
            <CardContent className="py-14 md:py-20 flex flex-col items-center justify-center">
              <div className="h-14 w-14 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200/80 mb-4">
                <Info className="h-6 w-6 text-slate-600" aria-hidden="true" />
              </div>
              <div role="status" className="text-slate-600 text-center max-w-lg px-6 leading-relaxed">
                {t('public.serviceDetail.noGalleryItems')}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8 max-w-2xl">
              <h2 className={publicHeader.title}>{t('public.serviceDetail.galleryTitle')}</h2>
              <p className={`${publicHeader.subtitle} mt-2`}>
                {t('public.serviceDetail.gallerySubtitle')}
              </p>
            </div>
            <BeforeAfterSpotlight
              pairs={items}
              loading={false}
              resolveBefore={(p) =>
                getUploadUrl(
                  p.before.pathMedium ?? p.before.pathThumb ?? p.before.pathOriginal,
                )
              }
              resolveAfter={(p) =>
                getUploadUrl(
                  p.after.pathMedium ?? p.after.pathThumb ?? p.after.pathOriginal,
                )
              }
            />
            {pairsLoadError ? (
              <div className="py-5 text-center" role="alert">
                <p className="text-slate-600">{t('public.serviceDetail.galleryLoadFailed')}</p>
                <Button variant="outline" className="mt-3" onClick={() => void loadPage(offset, true)}>
                  {t('public.serviceDetail.retry')}
                </Button>
              </div>
            ) : null}
            <div ref={sentinelRef} className="h-4 mt-8" />
            {loadingMore ? (
              <div role="status" aria-live="polite" className="py-8 text-center text-slate-600">
                {t('public.serviceDetail.loadingGallery')}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
