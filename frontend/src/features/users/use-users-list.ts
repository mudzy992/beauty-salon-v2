import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../../api/client'
import { fetchAllAdminUserRoleList } from '../../api/catalog'
import type { PaginatedResponse, UserRow } from './user-types'

export function useUsersList(onLoadError: () => void) {
  const onLoadErrorRef = useRef(onLoadError)
  onLoadErrorRef.current = onLoadError
  const [admins, setAdmins] = useState<UserRow[]>([])
  const [stylists, setStylists] = useState<UserRow[]>([])
  const [clients, setClients] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const requestSequenceRef = useRef(0)

  const [clientsSearch, setClientsSearch] = useState('')
  const [debouncedClientsSearch, setDebouncedClientsSearch] = useState('')

  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const loadData = useCallback(() => {
    const requestSequence = ++requestSequenceRef.current
    setLoading(true)
    setLoadError(false)
    Promise.all([
      fetchAllAdminUserRoleList<UserRow>('/api/users/system-admins'),
      fetchAllAdminUserRoleList<UserRow>('/api/users/stylists'),
      api.get<PaginatedResponse<UserRow>>('/api/users/clients/admin', {
        params: { page, pageSize, q: debouncedClientsSearch.trim() || undefined },
      }),
      api.get<Array<{ id: string }>>('/api/users/password-reset-candidates'),
    ])
      .then(([admins, stylists, clientsRes, resetCandidatesRes]) => {
        if (requestSequence !== requestSequenceRef.current) return
        if (!clientsRes.data || !Array.isArray(clientsRes.data.items) ||
            !Number.isSafeInteger(clientsRes.data.total) || clientsRes.data.total < 0 ||
            !Number.isSafeInteger(clientsRes.data.page) || clientsRes.data.page < 0 ||
            !Array.isArray(resetCandidatesRes.data)) throw new Error('Invalid users list response')
        const resetCandidateIds = new Set(resetCandidatesRes.data.map(({ id }) => id))
        const withResetStatus = (users: UserRow[]) =>
          users.map((user) => ({
            ...user,
            mustChangePassword: resetCandidateIds.has(user.id),
          }))
        setAdmins(withResetStatus(admins))
        setStylists(withResetStatus(stylists))
        setClients(withResetStatus(clientsRes.data.items))
        setTotal(clientsRes.data.total)
        if (clientsRes.data.page !== page) setPage(clientsRes.data.page)
      })
      .catch(() => {
        if (requestSequence !== requestSequenceRef.current) return
        onLoadErrorRef.current()
        setLoadError(true)
      })
      .finally(() => {
        if (requestSequence === requestSequenceRef.current) setLoading(false)
      })
  }, [page, pageSize, debouncedClientsSearch])

  useEffect(() => {
    loadData()
    return () => { requestSequenceRef.current += 1 }
  }, [loadData])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClientsSearch(clientsSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [clientsSearch])

  useEffect(() => {
    setPage(0)
  }, [debouncedClientsSearch])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const visiblePageNumbers = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const current = Math.min(totalPages - 1, Math.max(0, page))
    const windowSize = 5
    const half = Math.floor(windowSize / 2)
    const start = Math.max(0, Math.min(current - half, totalPages - windowSize))
    const end = Math.min(totalPages, start + windowSize)
    return { pages: Array.from({ length: end - start }, (_, i) => start + i), totalPages }
  }, [page, pageSize, total])

  return {
    admins, stylists, clients, loading, loadError, clientsSearch, setClientsSearch,
    page, setPage, total, totalPages, visiblePageNumbers, loadData,
  }
}
