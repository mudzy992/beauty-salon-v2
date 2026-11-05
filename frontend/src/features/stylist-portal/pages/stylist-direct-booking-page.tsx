import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import api from '../../../api/client'
import { fetchAllPublicServices } from '../../../api/catalog'
import { getErrorMessage } from '../../../api/error'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'
import { formatLocalizedAmount, getIntlLocale } from '../../../i18n/locale-utils.mjs'

type ClientOption = {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  gender?: 'MALE' | 'FEMALE'
}

type ServiceOption = {
  id: string
  name: string
  durationMinutes?: number
  price?: number | string
  gender?: 'MALE' | 'FEMALE'
}

export const StylistDirectBookingPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const navigate = useNavigate()
  const toast = useAppToast()
  const [services, setServices] = useState<ServiceOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
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

  const loadServices = useCallback(async () => {
    const requestId = ++servicesRequestIdRef.current
    setLoadingServices(true)
    setServicesLoadError(false)
    try {
      const result = await fetchAllPublicServices<ServiceOption>({ activeOnly: 'true' })
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
      const { data } = await api.get<{ items: ClientOption[] }>('/api/users/clients', {
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

  const handleSelectClient = (client: ClientOption) => {
    const label =
      [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.username
    setSelectedClient(client)
    setClientSearch(label)
    setServiceIds([])
  }

  const handleSubmit = async () => {
    if (!selectedClient?.gender) {
      toast.error(t('stylistPortal.directBooking.clientGenderRequired'))
      return
    }
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
      toast.success(t('stylistPortal.directBooking.created'))
      navigate('/stylist/schedule')
    } catch (error) {
      toast.error(getErrorMessage(error, t('stylistPortal.directBooking.createFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('stylistPortal.directBooking.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('stylistPortal.directBooking.description')}
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/stylist/schedule">{t('common.back')}</Link>
        </Button>
      </div>

      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="stylist-direct-booking-client">
            {t('stylistPortal.directBooking.client')}
          </Label>
          <Input
            id="stylist-direct-booking-client"
            value={clientSearch}
            onChange={(e) => {
              const value = e.target.value
              setClientSearch(value)
              if (selectedClient) {
                const label =
                  [selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ').trim() ||
                  selectedClient.username
                if (value.trim() !== label) {
                  setSelectedClient(null)
                  setServiceIds([])
                }
              }
            }}
            placeholder={t('stylistPortal.directBooking.searchClient')}
          />
          {loadingClients ? (
            <p role="status" aria-live="polite" className="text-sm text-slate-500">
              {t('common.loading')}
            </p>
          ) : null}
          {clientSearchError ? (
            <div role="alert" className="flex items-center justify-between gap-3 text-sm text-rose-600">
              <span>{t('stylistPortal.directBooking.clientSearchFailed')}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void searchClients(clientSearch.trim())}>
                {t('common.retry')}
              </Button>
            </div>
          ) : null}
          {!loadingClients && !clientSearchError && clientSearch.trim() && clients.length === 0 ? (
            <p className="text-sm text-slate-500">{t('stylistPortal.directBooking.noClients')}</p>
          ) : null}
          {clients.length > 0 ? (
            <div className="grid gap-2">
              {clients.map((client) => {
                const label =
                  [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.username
                const selected = selectedClient?.id === client.id
                return (
                  <button
                    key={client.id}
                    type="button"
                    aria-pressed={selected}
                    className={
                      selected
                        ? 'rounded-lg border border-brand-gold-ring bg-brand-champagne/20 px-3 py-2 text-left text-sm'
                        : 'rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800'
                    }
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-50">{label}</div>
                    <div className="text-xs text-slate-500">
                      {client.gender === 'MALE'
                        ? t('stylistPortal.directBooking.male')
                        : client.gender === 'FEMALE'
                          ? t('stylistPortal.directBooking.female')
                          : t('stylistPortal.directBooking.genderNotDefined')}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <fieldset className="space-y-2 border-0 p-0">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('stylistPortal.directBooking.services')}
          </legend>
          {servicesLoadError ? (
            <div role="alert" className="flex items-center justify-between gap-3 text-sm text-rose-600">
              <span>{t('stylistPortal.directBooking.serviceLoadFailed')}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadServices()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : !selectedClient ? (
            <p className="text-sm text-slate-500">{t('stylistPortal.directBooking.chooseClientForServices')}</p>
          ) : !selectedClient.gender ? (
            <p className="text-sm text-amber-600">{t('stylistPortal.directBooking.genderMissing')}</p>
          ) : loadingServices ? (
            <p role="status" aria-live="polite" className="text-sm text-slate-500">
              {t('common.loading')}
            </p>
          ) : filteredServices.length === 0 ? (
            <p className="text-sm text-slate-500">{t('stylistPortal.directBooking.noServices')}</p>
          ) : (
            <div className="grid gap-2">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={serviceIds.includes(service.id)}
                  className={
                    serviceIds.includes(service.id)
                      ? 'rounded-lg border border-brand-gold-ring bg-brand-champagne/20 px-3 py-2 text-left text-sm'
                      : 'rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800'
                  }
                  onClick={() => toggleServiceId(service.id)}
                >
                  <div className="font-medium text-slate-900 dark:text-slate-50">{service.name}</div>
                  <div className="text-xs text-slate-500">{formatLocalizedAmount(Number(service.price ?? 0), locale)}</div>
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="stylist-direct-booking-date">{t('stylistPortal.directBooking.date')}</Label>
            <Input id="stylist-direct-booking-date" type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stylist-direct-booking-start">{t('stylistPortal.directBooking.startTime')}</Label>
            <Input id="stylist-direct-booking-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stylist-direct-booking-end">{t('stylistPortal.directBooking.endTime')}</Label>
            <Input id="stylist-direct-booking-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stylist-direct-booking-note">{t('stylistPortal.directBooking.note')}</Label>
          <Textarea id="stylist-direct-booking-note" rows={4} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/stylist/schedule')}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={
              saving ||
              !selectedClient?.gender ||
              serviceIds.length === 0 ||
              !reservationDate ||
              !startTime ||
              !endTime
            }
            onClick={() => void handleSubmit()}
          >
            {saving ? t('stylistPortal.directBooking.creating') : t('stylistPortal.directBooking.create')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
