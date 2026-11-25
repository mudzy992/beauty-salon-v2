import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'
import { useAuthStore } from '../../stores/auth.store'
import {
  isValidEligiblePage,
  isValidPendingPage,
  type EligibleEntry,
  type PendingPair,
} from './work-gallery-upload-types.mjs'

const PAGE_SIZE = 20

type Params = { serviceId: string; enabled: boolean }

/**
 * Records that can still receive a private pair and the private pairs that are
 * waiting for the client's consent.
 *
 * Responses of an older session are dropped instead of being written into the
 * current one.
 */
export function useWorkGalleryRecords({ serviceId, enabled }: Params) {
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const owner = JSON.stringify([sessionVersion, serviceId, enabled])
  const ownerRef = useRef(owner)
  ownerRef.current = owner

  const entriesSequence = useRef(0)
  const pendingSequence = useRef(0)
  const entriesOffsetRef = useRef(0)
  const pendingLoadedRef = useRef(false)

  const [entries, setEntries] = useState<EligibleEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entriesError, setEntriesError] = useState(false)
  const [entriesHasMore, setEntriesHasMore] = useState(false)
  const [pending, setPending] = useState<PendingPair[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState(false)
  const [pendingLoaded, setPendingLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const loadEntries = useCallback(async (append: boolean) => {
    if (!serviceId || !enabled) return
    const request = ++entriesSequence.current
    const offset = append ? entriesOffsetRef.current : 0
    setEntriesLoading(true)
    setEntriesError(false)
    try {
      const { data } = await api.get(`/api/services/admin/work-gallery/${encodeURIComponent(serviceId)}/eligible-entries`, {
        params: { offset, limit: PAGE_SIZE },
      })
      if (!ownerRef.current || ownerRef.current !== owner) return
      if (useAuthStore.getState().sessionVersion !== sessionVersion) return
      if (entriesSequence.current !== request) return
      if (!isValidEligiblePage(data)) throw new Error('Invalid eligible entries page')
      setEntries(previous => (append ? [...previous, ...data.items] : data.items))
      entriesOffsetRef.current = data.nextOffset
      setEntriesHasMore(data.hasMore)
      setSelectedId(previous => {
        if (previous && data.items.some(entry => entry.id === previous)) return previous
        if (append) return previous
        return data.items[0]?.id ?? ''
      })
    } catch {
      if (ownerRef.current === owner && entriesSequence.current === request) {
        setEntriesError(true)
        if (!append) setEntries([])
      }
    } finally {
      if (ownerRef.current === owner && entriesSequence.current === request) setEntriesLoading(false)
    }
  }, [serviceId, enabled, owner, sessionVersion])

  const loadPending = useCallback(async () => {
    if (!serviceId || !enabled) return
    const request = ++pendingSequence.current
    setPendingLoading(true)
    setPendingError(false)
    setPendingLoaded(true)
    pendingLoadedRef.current = true
    try {
      const { data } = await api.get(`/api/services/admin/work-gallery/${encodeURIComponent(serviceId)}/pending-consent`, {
        params: { offset: 0, limit: PAGE_SIZE },
      })
      if (ownerRef.current !== owner) return
      if (useAuthStore.getState().sessionVersion !== sessionVersion) return
      if (pendingSequence.current !== request) return
      if (!isValidPendingPage(data)) throw new Error('Invalid pending page')
      setPending(data.items)
    } catch {
      if (ownerRef.current === owner && pendingSequence.current === request) {
        setPendingError(true)
        setPending([])
      }
    } finally {
      if (ownerRef.current === owner && pendingSequence.current === request) setPendingLoading(false)
    }
  }, [serviceId, enabled, owner, sessionVersion])

  const reload = useCallback(() => {
    void loadEntries(false)
    // The pending list is loaded on demand; only refresh it when it is open.
    if (pendingLoadedRef.current) void loadPending()
  }, [loadEntries, loadPending])

  useEffect(() => {
    if (!enabled || !serviceId) {
      entriesSequence.current += 1
      pendingSequence.current += 1
      entriesOffsetRef.current = 0
      pendingLoadedRef.current = false
      setEntries([])
      setEntriesLoading(false)
      setEntriesError(false)
      setEntriesHasMore(false)
      setPending([])
      setPendingLoading(false)
      setPendingError(false)
      setPendingLoaded(false)
      setSelectedId('')
      return
    }
    void loadEntries(false)
    return () => {
      entriesSequence.current += 1
      pendingSequence.current += 1
    }
  }, [enabled, serviceId, loadEntries])

  return {
    entries,
    entriesLoading,
    entriesError,
    entriesHasMore,
    pending,
    pendingLoading,
    pendingError,
    pendingLoaded,
    selectedId,
    setSelectedId,
    loadEntries,
    loadPending,
    reload,
  }
}
