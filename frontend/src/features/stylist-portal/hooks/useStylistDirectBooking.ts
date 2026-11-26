import { useEffect, useMemo, useState } from 'react'

import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'
import { useStylistDirectBookingCatalog } from './useStylistDirectBookingCatalog'
import { useStylistDirectBookingSubmission } from './useStylistDirectBookingSubmission'
import type { DirectBookingClient } from '../direct-booking.types'

export type { DirectBookingClient, DirectBookingService } from '../direct-booking.types'

/** Komponuje katalog, odabir i raspored termina za direktno zakazivanje. */
export const useStylistDirectBooking = () => {
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<DirectBookingClient | null>(null)
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [reservationDate, setReservationDate] = useState(getSalonDateOnly())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [clientNotes, setClientNotes] = useState('')

  const catalog = useStylistDirectBookingCatalog({ clientSearch, selectedClient })
  const { services } = catalog
  const submission = useStylistDirectBookingSubmission({
    selectedClient,
    serviceIds,
    reservationDate,
    startTime,
    endTime,
    clientNotes,
  })

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

  /** Promjena teksta koji više ne odgovara odabranom klijentu čisti i usluge. */
  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    if (selectedClient && value.trim() !== clientLabel(selectedClient)) {
      setSelectedClient(null)
      setServiceIds([])
    }
  }

  return {
    services: catalog.services,
    clients: catalog.clients,
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
    saving: submission.saving,
    loadingServices: catalog.loadingServices,
    servicesLoadError: catalog.servicesLoadError,
    loadingClients: catalog.loadingClients,
    clientSearchError: catalog.clientSearchError,
    filteredServices,
    loadServices: catalog.loadServices,
    searchClients: catalog.searchClients,
    toggleServiceId,
    handleSelectClient,
    handleClientSearchChange,
    clientLabel,
    handleSubmit: submission.handleSubmit,
  }
}
