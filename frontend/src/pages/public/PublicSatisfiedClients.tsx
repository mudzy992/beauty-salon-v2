import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import api from '../../api/client'
import { getUploadUrl } from '../../utils/uploadUrl'
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider'
import { Button } from '../../components/ui/button'
import { publicHeader, publicPage } from '../../features/shell/public/public-ui'

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
    <div className="py-12 sm:py-16 bg-white min-h-[60vh]">
      <div className={publicPage.container}>
        <div className="max-w-2xl mb-10 md:mb-12">
          <div className={publicHeader.kicker}>Transformacije</div>
          <h1 className={`${publicHeader.title} mt-2`}>Zadovoljni klijenti</h1>
          <p className={`${publicHeader.subtitle} mt-3`}>
            Povucite slider lijevo ili desno da vidite prije i poslije. Lista se automatski
            dopunjava dok skrolate.
          </p>
        </div>

        {loading && items.length === 0 ? (
          <div className="py-16 text-center text-slate-600">Učitavanje…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-slate-500 py-12">Nema prikazanih transformacija.</div>
        ) : (
          <>
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:thin]">
              {items.map((pair) => (
                <MotionDiv
                  key={pair.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="snap-center shrink-0 w-[min(88vw,20rem)] md:shrink md:w-auto"
                >
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-soft">
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

