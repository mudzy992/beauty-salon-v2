import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'

export interface ClientPickerRow {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

const PAGE_SIZE = 20

/**
 * Lista klijenata za analitički tab „Klijenti“.
 *
 * Služi i kao izvor za paginaciju: backend vraća `{ items, total, page }`,
 * a odziv starija verzija ili neispravan payload ne smije napuniti listu
 * djelomičnim podacima (ista pravila kao u `useUsersList`).
 */
export function useClientPicker() {
  const [items, setItems] = useState<ClientPickerRow[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const sequence = useRef(0)

  const load = useCallback(() => {
    const request = ++sequence.current
    setLoading(true)
    setLoadError(false)
    api
      .get<{ items?: ClientPickerRow[]; total?: number; page?: number }>('/api/users/clients/admin', {
        params: { page, pageSize: PAGE_SIZE, q: debouncedSearch.trim() || undefined },
      })
      .then(({ data }) => {
        if (request !== sequence.current) return
        const items = data?.items
        const total = data?.total
        if (!Array.isArray(items) || !Number.isSafeInteger(total) || (total as number) < 0) {
          throw new Error('Invalid client picker response')
        }
        setItems(items)
        setTotal(total as number)
        if (Number.isSafeInteger(data?.page) && data.page !== page) setPage(data.page as number)
      })
      .catch(() => {
        if (request !== sequence.current) return
        setLoadError(true)
      })
      .finally(() => {
        if (request === sequence.current) setLoading(false)
      })
  }, [page, debouncedSearch])

  useEffect(() => {
    load()
    return () => {
      sequence.current += 1
    }
  }, [load])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    items,
    search,
    setSearch,
    page,
    setPage,
    total,
    totalPages,
    loading,
    loadError,
    reload: load,
  }
}
