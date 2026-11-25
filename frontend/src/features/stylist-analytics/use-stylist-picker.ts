import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'

export interface StylistPickerRow {
  id: string
  specialization: string | null
  status?: string | null
  isActive: boolean
  user?: { username: string; email: string | null; firstName: string | null; lastName: string | null } | null
}

const PAGE_SIZE = 20

/**
 * Backend ograničenje (`MAX_API_PAGE_OFFSET` u `backend/src/common/pagination.constants.ts`):
 * stilist endpoint odbija `offset > 1000` sa 400, pa se lista ne smije
 * tražiti izvan te granice. Granica se ponavlja i u DTO-u (`@Max`).
 */
const MAX_OFFSET = 1000
const MAX_PAGE = Math.floor(MAX_OFFSET / PAGE_SIZE)

/**
 * Lista profila stilista za analitički tab „Stilisti“.
 *
 * `?stylistId=` je ID profila (ne naloga), pa se čita isti izvor kao na
 * stranici upravljanja stilistima. Backend vraća paginiranu listu; stariji
 * oblik (niz) se prihvata, a neispravan payload se ne prikazuje djelomično.
 */
export function useStylistPicker() {
  const [items, setItems] = useState<StylistPickerRow[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const sequence = useRef(0)

  const load = useCallback(() => {
    const request = ++sequence.current
    setLoading(true)
    setLoadError(false)
    api
      .get<StylistPickerRow[] | { items?: StylistPickerRow[]; total?: number; page?: number; hasMore?: boolean }>(
        '/api/stylists/admin',
        { params: { page, pageSize: PAGE_SIZE } },
      )
      .then(({ data }) => {
        if (request !== sequence.current) return
        if (Array.isArray(data)) {
          setItems(data)
          setTotal(data.length)
          setHasMore(false)
          return
        }
        const items = data?.items
        const total = data?.total
        if (!Array.isArray(items) || !Number.isSafeInteger(total) || (total as number) < 0) {
          throw new Error('Invalid stylist picker response')
        }
        setItems(items)
        setTotal(total as number)
        setHasMore(data?.hasMore === true)
        if (Number.isSafeInteger(data?.page) && data.page !== page) setPage(data.page as number)
      })
      .catch(() => {
        if (request !== sequence.current) return
        setLoadError(true)
      })
      .finally(() => {
        if (request === sequence.current) setLoading(false)
      })
  }, [page])

  useEffect(() => {
    load()
    return () => {
      sequence.current += 1
    }
  }, [load])

  const totalPages = Math.max(1, Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGE + 1))

  return { items, page, setPage, total, totalPages, hasMore, loading, loadError, reload: load }
}
