import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  fetchClientDebts,
  fetchServicesForStylist,
  fetchStylists,
  searchClients,
} from '../api/lookups.api'
import { financeKeys } from './query-keys'

const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_LENGTH = 2

export const useStylists = (enabled = true) =>
  useQuery({
    queryKey: financeKeys.stylists(),
    queryFn: fetchStylists,
    enabled,
    staleTime: 5 * 60 * 1000,
  })

export const useStylistServices = (stylistProfileId: string | null) =>
  useQuery({
    queryKey: financeKeys.stylistServices(stylistProfileId ?? ''),
    queryFn: () => fetchServicesForStylist(stylistProfileId as string),
    enabled: Boolean(stylistProfileId),
    staleTime: 5 * 60 * 1000,
  })

export const useClientSearch = (query: string) => {
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: financeKeys.clientSearch(debounced),
    queryFn: () => searchClients(debounced),
    enabled: debounced.length >= MIN_SEARCH_LENGTH,
  })
}

export const useClientDebts = (clientId: string | null) =>
  useQuery({
    queryKey: financeKeys.clientDebts(clientId ?? ''),
    queryFn: () => fetchClientDebts(clientId as string),
    enabled: Boolean(clientId),
  })
