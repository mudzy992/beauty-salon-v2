import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import api from '../../api/client'
import { getUploadUrl } from '../../utils/uploadUrl'
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider'
import { useSettings } from '../../context/SettingsContext'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'

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
  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)
  const { getSetting } = useSettings()

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

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-slate-950 text-white py-14 md:py-18 mb-12 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: `url('${service.heroImage ? getUploadUrl(service.heroImage) : getSetting('public_services_bg', 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&q=80&w=2000')}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50" />
        <div className="mx-auto max-w-6xl px-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="text-brand-gold font-semibold uppercase tracking-widest text-sm mb-2">
                Usluga
              </div>
              <div className="text-3xl md:text-4xl font-semibold leading-tight">
                {service.name}
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-brand-gold text-black px-3 py-1 text-xs font-semibold">
                  {service.durationMinutes} min
                </span>
              </div>
              {service.shortDescription ? (
                <div className="text-slate-200 mt-4 max-w-3xl">
                  {service.shortDescription}
                </div>
              ) : null}
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Link to={`/rezervacija?serviceId=${encodeURIComponent(service.id)}`}>
                <Button>Rezerviši</Button>
              </Link>
              <Link to="/usluge">
                <Button variant="outline">Sve usluge</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {loadingPairs || items.length > 0 ? (
          <div className="mb-6">
            <div className="text-xl font-semibold text-slate-900 mb-2">
              Galerija urađenih radova
            </div>
            <div className="text-slate-600">
              Povucite sliku lijevo ili desno da vidite prije i poslije.
            </div>
          </div>
        ) : null}

        {loadingPairs && items.length === 0 ? (
          <div className="py-14 text-center text-slate-600">Učitavanje…</div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-14 md:py-20 flex flex-col items-center justify-center">
              <div className="h-14 w-14 rounded-full flex items-center justify-center bg-brand-champagne/30 border border-brand-champagne mb-4">
                <Info className="h-6 w-6 text-brand-gold" />
              </div>
              <div className="text-slate-600 text-center max-w-lg px-6">
                Trenutno nema objavljenih urađenih radova za ovaj servis.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((pair) => (
                <div key={pair.id}>
                  <BeforeAfterSlider
                    beforeSrc={getUploadUrl(
                      pair.before.pathMedium ??
                        pair.before.pathThumb ??
                        pair.before.pathOriginal,
                    )}
                    afterSrc={getUploadUrl(
                      pair.after.pathMedium ??
                        pair.after.pathThumb ??
                        pair.after.pathOriginal,
                    )}
                    alt="Prije / Poslije"
                    aspectRatio={1}
                  />
                </div>
              ))}
            </div>
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

