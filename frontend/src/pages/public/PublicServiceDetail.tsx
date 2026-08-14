import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  service?: { id: string; name: string }
  completedAt?: string | null
}

const PAGE_SIZE = 12

export default function PublicServiceDetail() {
  const { serviceId } = useParams()
  const { getSetting } = useSettings()
  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)
  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const id = useMemo(() => (serviceId ?? '').trim(), [serviceId])

  const loadService = useCallback(async () => {
    if (!id) {
      setService(null)
      setLoadingService(false)
      return
    }
    setLoadingService(true)
    try {
      const { data } = await api.get<Service>(`/api/services/${id}`)
      setService(data)
    } catch {
      setService(null)
    } finally {
      setLoadingService(false)
    }
  }, [id])

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!id) return
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
      <div className="py-16 text-center text-slate-600">Učitavanje…</div>
    )
  }

  if (!service) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Servis nije pronađen
          </div>
          <div className="text-slate-600 mb-6">
            Molimo provjerite link ili se vratite na listu usluga.
          </div>
          <Link to="/usluge">
            <Button variant="outline">Nazad na usluge</Button>
          </Link>
        </div>
      </div>
    )
  }

  const hasServiceHeroImage = Boolean(service.heroImage?.trim())
  const detailHeroBg = hasServiceHeroImage
    ? getUploadUrl(service.heroImage as string)
    : getSetting('public_services_bg', '')
  const heroImageAlt = `${service.name} — vizual usluge`

  const canonicalPath = `/usluge/${service.id}`
  const description =
    service.shortDescription?.trim() ||
    'Detalji usluge i primjeri prije/poslije u Beauty Salon Nejra.'
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
              <div className={publicHeader.kicker}>Usluga</div>
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
                    Rezerviši
                  </Button>
                </Link>
                <Link to="/usluge">
                  <Button variant="outline" className="px-6">
                    Sve usluge
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        {loadingPairs && items.length === 0 ? (
          <div className="py-14 text-center text-slate-600">Učitavanje…</div>
        ) : items.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/80 shadow-soft">
            <CardContent className="py-14 md:py-20 flex flex-col items-center justify-center">
              <div className="h-14 w-14 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200/80 mb-4">
                <Info className="h-6 w-6 text-slate-600" />
              </div>
              <div className="text-slate-600 text-center max-w-lg px-6 leading-relaxed">
                Trenutno nema objavljenih urađenih radova za ovaj servis.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8 max-w-2xl">
              <h2 className={publicHeader.title}>Galerija urađenih radova</h2>
              <p className={`${publicHeader.subtitle} mt-2`}>
                Jedna transformacija u fokusu; ostale birajte sa strane. Povucite slider
                lijevo-desno za usporedbu prije i poslije.
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
            <div ref={sentinelRef} className="h-4 mt-8" />
            {loadingMore ? (
              <div className="py-8 text-center text-slate-600">Učitavanje…</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
