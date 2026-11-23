import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'
import type { StylistProfile } from './stylist-types'
import { useStylistEditor } from './use-stylist-editor'
import { useAuthStore } from '../../stores/auth.store'

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function useStylistManagement() {
  const [stylists, setStylists] = useState<StylistProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const sequence = useRef(0)
  const sessionVersion = useAuthStore(state => state.sessionVersion)

  const loadData = useCallback(() => {
    const request = ++sequence.current
    const session = sessionVersion
    const current = () => request === sequence.current && useAuthStore.getState().sessionVersion === session
    setLoading(true)
    setLoadError(false)
    api.get<StylistProfile[] | PaginatedResponse<StylistProfile>>('/api/stylists/admin', { params: { page, pageSize } })
      .then(({ data }) => {
        if (!current()) return
        if (Array.isArray(data)) {
          setStylists(data)
          setTotal(data.length)
          return
        }
        if (!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid stylist list')
        setStylists(data.items)
        setTotal(data.total)
      })
      .catch(() => { if (current()) setLoadError(true) })
      .finally(() => { if (current()) setLoading(false) })
  }, [page, pageSize, sessionVersion])

  useEffect(() => {
    loadData()
    return () => { sequence.current += 1 }
  }, [loadData])

  const editor = useStylistEditor(loadData)
  return { stylists, loading, loadError, loadData, page, setPage, pageSize, total, ...editor }
}
