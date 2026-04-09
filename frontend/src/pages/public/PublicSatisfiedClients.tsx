import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import api from '../../api/client'
import { getUploadUrl } from '../../utils/uploadUrl'
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider'
import { Button } from '../../components/ui/button'

const MotionDiv = motion.div
const PAGE_SIZE = 12

interface BeforeAfterPair {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

export default function PublicSatisfiedClients() {
  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadPage = useCallback(async (nextOffset: number, append: boolean) => {
    if (nextOffset === 0) setLoading(true)
    else setLoadingMore(true)
    try {
      const { data } = await api.get<{
        items: BeforeAfterPair[]
        hasMore: boolean
        nextOffset: number
      }>('/api/daily-log/before-after', {
        params: { limit: PAGE_SIZE, offset: nextOffset },
      })
      const list = Array.isArray(data?.items) ? data.items : []
      setItems((prev) => (append ? [...prev, ...list] : list))
      setHasMore(data?.hasMore ?? false)
      setOffset(data?.nextOffset ?? nextOffset + list.length)
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(0, false)
  }, [loadPage])

  useEffect(() => {
    if (!hasMore || loadingMore) return
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
  }, [hasMore, loadingMore, offset, loadPage])

  return (
    <div className="py-12 bg-slate-50 min-h-[60vh]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-10">
          <div className="text-brand-gold font-semibold uppercase tracking-widest text-sm mb-2">
            Transformacije
          </div>
          <div className="text-4xl font-semibold text-slate-950">
            Zadovoljni klijenti
          </div>
          <div className="text-slate-600 mt-2 max-w-xl mx-auto">
            Povucite sliku lijevo ili desno da vidite prije i poslije.
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="py-16 text-center text-slate-600">Učitavanje…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            Nema prikazanih transformacija.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((pair) => (
                <MotionDiv
                  key={pair.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
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
                </MotionDiv>
              ))}
            </div>
            <div ref={sentinelRef} className="h-4 mt-8" />
            {loadingMore ? (
              <div className="py-8 text-center text-slate-600">Učitavanje…</div>
            ) : null}
          </>
        )}

        <div className="text-center mt-10">
          <Link to="/">
            <Button variant="outline">Nazad na početnu</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

