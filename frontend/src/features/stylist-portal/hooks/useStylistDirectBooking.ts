import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import api from '../../../api/client'
import { fetchAllPublicServices } from '../../../api/catalog'
import { getErrorMessage, getErrorCode } from '../../../api/error'
import { resolveAdminApiError } from '../../admin/admin-api-error.mjs'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { useAuthStore } from '../../../stores/auth.store'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'

export type DirectBookingClient = {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  gender?: 'MALE' | 'FEMALE'
}

export type DirectBookingService = {
  id: string
  name: string
  durationMinutes?: number
  price?: number | string
  gender?: 'MALE' | 'FEMALE'
}

/**
 * Stanje i tok direktnog zakazivanja (S10).
 *
 * Izdvojeno iz `pages/stylist-direct-booking-page.tsx` **bez promjene**:
 * učitavanje usluga, pretraga klijenata, filtriranje usluga po spolu,
 * automatski kraj termina i slanje rezervacije.
 *
 * Tri mehanizma zaštite su **nepromijenjena**:
 *  1. `servicesRequestIdRef` / `clientSearchRequestIdRef` — stariji odgovor
 *     ne smije prebrisati novije stanje (superseded request guard);
 *  2. `submitGeneration` + `sessionVersion` — odgovor iz prethodne sesije
 *     ne smije navigirati ni pokazati toast;
 *  3. `submitInFlight` — dvostruki submit se ignoriše.
 */
export const useStylistDirectBooking = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useAppToast()
  const [services, setServices] = useState<DirectBookingService[]>([])
  const [clients, setClients] = useState<DirectBookingClient[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<DirectBookingClient | null>(null)
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [reservationDate, setReservationDate] = useState(getSalonDateOnly())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [clientNotes, setClientNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingServices, setLoadingServices] = useState(true)
  const [servicesLoadError, setServicesLoadError] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [clientSearchError, setClientSearchError] = useState(false)
  const servicesRequestIdRef = useRef(0)
  const clientSearchRequestIdRef = useRef(0)
  const submitGeneration = useRef(0)
  const submitInFlight = useRef(false)

  useEffect(() => () => {
    submitGeneration.current += 1
    submitInFlight.current = false
  }, [])

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

  const filteredServices = useMemo(() => {
    const gender = selectedClient?.gender
    if (gender !== 'MALE' && gender !== 'FEMALE') return []
    return services.filter((service) => service.gender === gender)
  }, [selectedClient?.gender, services])

  useEffect(() => {
    setServiceIds((current) =>
      current.filter((id) => filteredServices.some((service) => service.id === id)),
    )
  }, [filteredServices])

  useEffect(() => {
    const totalMinutes = serviceIds
      .map((id) => filteredServices.find((service) => service.id === id)?.durationMinutes ?? 0)
      .reduce((sum, value) => sum + value, 0)
    if (totalMinutes <= 0 || !startTime) return
    const [hours, minutes] = startTime.split(':').map(Number)
    const total = hours * 60 + minutes + totalMinutes
    setEndTime(`${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`)
  }, [filteredServices, serviceIds, startTime])

  const toggleServiceId = (serviceId: string) => {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    )
  }

  const handleSelectClient = (client: DirectBookingClient) => {
    const label =
      [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.username
    setSelectedClient(client)
    setClientSearch(label)
    setServiceIds([])
  }

  /** Tekstualna oznaka klijenta — identično u svim mjestima prikaza. */
  const clientLabel = (client: DirectBookingClient) =>
    [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.username

  /**
   * Promjena pretrage klijenata. Ako tekst više ne odgovara odabranom
   * klijentu, odabir se poništava (i usluge se čiste) — isto kao prije.
   */
  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    if (selectedClient) {
      if (value.trim() !== clientLabel(selectedClient)) {
        setSelectedClient(null)
        setServiceIds([])
      }
    }
  }

  const handleSubmit = async () => {
    if (submitInFlight.current) return
    if (!selectedClient?.gender) {
      toast.error(t('stylistPortal.directBooking.clientGenderRequired'))
      return
    }
    const generation = ++submitGeneration.current
    const sessionVersion = useAuthStore.getState().sessionVersion
    const isCurrent = () => generation === submitGeneration.current && useAuthStore.getState().sessionVersion === sessionVersion
    submitInFlight.current = true
    setSaving(true)
    try {
      await api.post('/api/reservations/stylist/direct', {
        clientId: selectedClient.id,
        serviceIds,
        reservationDate,
        startTime,
        endTime,
        clientNotes: clientNotes.trim() || undefined,
      })
      if (!isCurrent()) return
      toast.success(t('stylistPortal.directBooking.created'))
      navigate('/stylist/schedule')
    } catch (error) {
      if (!isCurrent()) return
      const apiErr = resolveAdminApiError(getErrorMessage(error, ''), 'stylistPortal.directBooking.createFailed', getErrorCode(error))
      toast.error(t(apiErr.key, apiErr.values))
    } finally {
      if (generation === submitGeneration.current) {
        submitInFlight.current = false
        setSaving(false)
      }
    }
  }

  return {
    services,
    clients,
    clientSearch,
    selectedClient,
    serviceIds,
    reservationDate,
    setReservationDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    clientNotes,
    setClientNotes,
    saving,
    loadingServices,
    servicesLoadError,
    loadingClients,
    clientSearchError,
    filteredServices,
    loadServices,
    searchClients,
    toggleServiceId,
    handleSelectClient,
    handleClientSearchChange,
    clientLabel,
    handleSubmit,
  }
}
