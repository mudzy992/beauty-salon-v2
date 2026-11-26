import { useCallback, useEffect, useRef, useState } from 'react'

import api from '../../../api/client'
import { fetchAllPublicServices } from '../../../api/catalog'
import type { DirectBookingClient, DirectBookingService } from '../direct-booking.types'

/** Services and client-search reads, including existing stale-request guards. */
export const useStylistDirectBookingCatalog = ({
  clientSearch,
  selectedClient,
}: {
  clientSearch: string
  selectedClient: DirectBookingClient | null
}) => {
  const [services, setServices] = useState<DirectBookingService[]>([])
  const [clients, setClients] = useState<DirectBookingClient[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [servicesLoadError, setServicesLoadError] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [clientSearchError, setClientSearchError] = useState(false)
  const servicesRequestIdRef = useRef(0)
  const clientSearchRequestIdRef = useRef(0)

  const loadServices = useCallback(async () => {
    const requestId = ++servicesRequestIdRef.current
    setLoadingServices(true)
    setServicesLoadError(false)
    try {
      const result = await fetchAllPublicServices<DirectBookingService>({ activeOnly: 'true' })
      if (!Array.isArray(result)) throw new Error('Invalid services response')
      if (requestId === servicesRequestIdRef.current) setServices(result)
    } catch {
      if (requestId === servicesRequestIdRef.current) {
        setServices([])
        setServicesLoadError(true)
      }
    } finally {
      if (requestId === servicesRequestIdRef.current) setLoadingServices(false)
    }
  }, [])

  const searchClients = useCallback(async (query: string) => {
    const requestId = ++clientSearchRequestIdRef.current
    setLoadingClients(true)
    setClientSearchError(false)
    setClients([])
    try {
      const { data } = await api.get<{ items: DirectBookingClient[] }>('/api/users/clients', {
        params: { page: 0, pageSize: 10, q: query },
      })
      if (!Array.isArray(data?.items)) throw new Error('Invalid clients response')
      if (requestId === clientSearchRequestIdRef.current) setClients(data.items)
    } catch {
      if (requestId === clientSearchRequestIdRef.current) {
        setClients([])
        setClientSearchError(true)
      }
    } finally {
      if (requestId === clientSearchRequestIdRef.current) setLoadingClients(false)
    }
  }, [])

  useEffect(() => {
    void loadServices()
    return () => {
      servicesRequestIdRef.current += 1
    }
  }, [loadServices])

  useEffect(() => {
    const query = clientSearch.trim()
    if (!query) {
      clientSearchRequestIdRef.current += 1
      setClients([])
      setLoadingClients(false)
      setClientSearchError(false)
      return
    }

    const selectedLabel = selectedClient
      ? [selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ').trim() ||
        selectedClient.username
      : ''
    if (selectedClient && query === selectedLabel) {
      clientSearchRequestIdRef.current += 1
      setClients([selectedClient])
      setLoadingClients(false)
      setClientSearchError(false)
      return
    }

    setClients([])
    setLoadingClients(true)
    setClientSearchError(false)
    const handle = window.setTimeout(() => void searchClients(query), 250)
    return () => {
      window.clearTimeout(handle)
      clientSearchRequestIdRef.current += 1
    }
  }, [clientSearch, selectedClient, searchClients])

  return {
    services,
    clients,
    loadingServices,
    servicesLoadError,
    loadingClients,
    clientSearchError,
    loadServices,
    searchClients,
  }
}
