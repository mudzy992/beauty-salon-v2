import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'
import { useAuthStore } from '../../stores/auth.store'

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

export function useServiceWorkGallery(id: string) {
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const owner = JSON.stringify([sessionVersion, id])
  const ownerRef = useRef(owner)
  ownerRef.current = owner
  const serviceSequence = useRef(0)
  const pageSequence = useRef(0)
  const pageInFlight = useRef<{ owner: string; sequence: number } | null>(null)

  const [serviceOwner, setServiceOwner] = useState('')
  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)
  const [serviceLoadError, setServiceLoadError] = useState(false)
  const [pairsOwner, setPairsOwner] = useState('')
  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [pairsLoadError, setPairsLoadError] = useState(false)
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadService = useCallback(async () => {
    const request = ++serviceSequence.current
    const current = () => request === serviceSequence.current && ownerRef.current === owner && useAuthStore.getState().sessionVersion === sessionVersion
    setServiceOwner(owner)
    setService(null)
    setServiceLoadError(false)
    if (!id) { setLoadingService(false); return }
    setLoadingService(true)
    try {
      const { data } = await api.get<Service>(`/api/services/admin/services/${id}`)
      if (!current()) return
      if (!data || data.id !== id || typeof data.name !== 'string' || !Number.isFinite(data.durationMinutes)) throw new Error('Invalid gallery service')
      setService(data)
    } catch {
      if (current()) { setService(null); setServiceLoadError(true) }
    } finally {
      if (current()) setLoadingService(false)
    }
  }, [id, owner, sessionVersion])

  const loadPage = useCallback(async (nextOffset: number, append: boolean) => {
    if (!id || pageInFlight.current?.owner === owner) return
    const request = ++pageSequence.current
    pageInFlight.current = { owner, sequence: request }
    const current = () => request === pageSequence.current && ownerRef.current === owner && useAuthStore.getState().sessionVersion === sessionVersion
    setPairsOwner(owner)
    setPairsLoadError(false)
    if (nextOffset === 0) setLoadingPairs(true)
    else setLoadingMore(true)
    try {
      const { data } = await api.get<{ items: BeforeAfterPair[]; hasMore: boolean; nextOffset: number }>('/api/daily-log/before-after', {
        params: { serviceId: id, limit: PAGE_SIZE, offset: nextOffset },
      })
      if (!current()) return
      if (!data || !Array.isArray(data.items) || typeof data.hasMore !== 'boolean' || !Number.isSafeInteger(data.nextOffset) || data.nextOffset < 0 ||
          (data.hasMore && data.nextOffset <= nextOffset) ||
          data.items.some(pair => !pair || typeof pair.id !== 'string' || !pair.id || [pair.before, pair.after].some(image => !image || typeof image.pathOriginal !== 'string' || !image.pathOriginal.trim() || (image.pathMedium != null && typeof image.pathMedium !== 'string') || (image.pathThumb != null && typeof image.pathThumb !== 'string')))) {
        throw new Error('Invalid gallery page')
      }
      setItems(prev => append ? [...prev, ...data.items] : data.items)
      setHasMore(data.hasMore)
      setOffset(data.nextOffset)
    } catch {
      if (current()) { setPairsLoadError(true); setHasMore(false) }
    } finally {
      if (pageInFlight.current?.sequence === request) pageInFlight.current = null
      if (current()) { setLoadingPairs(false); setLoadingMore(false) }
    }
  }, [id, owner, sessionVersion])

  // Invalidate an in-flight page before a mutation-triggered reload; otherwise
  // an older append can reintroduce an item that was just hidden.
  const reloadPairs = useCallback(() => {
    pageSequence.current += 1
    pageInFlight.current = null
    setItems([])
    setOffset(0)
    setHasMore(Boolean(id))
    setPairsLoadError(false)
    setLoadingMore(false)
    if (id) void loadPage(0, false)
  }, [id, loadPage])

  useEffect(() => {
    void loadService()
    return () => { serviceSequence.current += 1 }
  }, [loadService])

  useEffect(() => {
    setPairsOwner(owner)
    setItems([])
    setOffset(0)
    setHasMore(Boolean(id))
    setPairsLoadError(false)
    setLoadingMore(false)
    if (id) void loadPage(0, false)
    else setLoadingPairs(false)
    return () => { pageSequence.current += 1; pageInFlight.current = null }
  }, [id, owner, loadPage])

  useEffect(() => {
    if (pairsOwner !== owner || !hasMore || loadingMore || loadingPairs || typeof IntersectionObserver === 'undefined') return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void loadPage(offset, true)
    }, { rootMargin: '200px', threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [pairsOwner, owner, hasMore, loadingMore, loadingPairs, offset, loadPage])

  const currentService = serviceOwner === owner
  const currentPairs = pairsOwner === owner
  return {
    service: currentService ? service : null,
    loadingService: !currentService || loadingService,
    serviceLoadError: currentService && serviceLoadError,
    items: currentPairs ? items : [],
    pairsLoadError: currentPairs && pairsLoadError,
    loadingPairs: !currentPairs || loadingPairs,
    loadingMore: currentPairs && loadingMore,
    hasMore: currentPairs && hasMore,
    offset: currentPairs ? offset : 0,
    sentinelRef, loadService, loadPage, reloadPairs,
  }
}
