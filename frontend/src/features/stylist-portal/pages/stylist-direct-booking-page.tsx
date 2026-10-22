import { useEffect, useMemo, useState } from 'react'
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
  const navigate = useNavigate()
  const toast = useAppToast()
  const [services, setServices] = useState<ServiceOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [clientNotes, setClientNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAllPublicServices<ServiceOption>({ activeOnly: 'true' })
      .then(setServices)
      .catch(() => setServices([]))
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const q = clientSearch.trim()
      if (!q) {
        setClients([])
        return
      }
      const selectedLabel = selectedClient
        ? [selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ').trim() ||
          selectedClient.username
        : ''
      if (selectedClient && q === selectedLabel) {
        setClients([selectedClient])
        return
      }
      api
        .get<{ items: ClientOption[] }>('/api/users/clients', {
          params: { page: 0, pageSize: 10, q },
        })
        .then(({ data }) => setClients(Array.isArray(data.items) ? data.items : []))
        .catch(() => setClients([]))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [clientSearch, selectedClient])

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
      toast.error('Odaberite klijenta sa definisanim spolom')
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
      toast.success('Direktna rezervacija je kreirana')
      navigate('/stylist/schedule')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Kreiranje termina nije uspjelo'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Direktna rezervacija</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Termin se odmah dodjeljuje vama i ne traži attendance potvrdu klijenta.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/stylist/schedule">Nazad</Link>
        </Button>
      </div>

      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Klijent</Label>
          <Input
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
            placeholder="Pretraži klijenta..."
          />
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
                    className={
                      selected
                        ? 'rounded-lg border border-brand-gold bg-brand-champagne/20 px-3 py-2 text-left text-sm'
                        : 'rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800'
                    }
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-50">{label}</div>
                    <div className="text-xs text-slate-500">
                      {client.gender === 'MALE'
                        ? 'Muški'
                        : client.gender === 'FEMALE'
                          ? 'Ženski'
                          : 'Spol nije definisan'}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Servisi</Label>
          {!selectedClient ? (
            <p className="text-sm text-slate-500">Prvo odaberite klijenta — lista se filtrira po spolu.</p>
          ) : !selectedClient.gender ? (
            <p className="text-sm text-amber-600">Klijent nema definisan spol.</p>
          ) : filteredServices.length === 0 ? (
            <p className="text-sm text-slate-500">Nema aktivnih servisa za odabrani spol.</p>
          ) : (
            <div className="grid gap-2">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={
                    serviceIds.includes(service.id)
                      ? 'rounded-lg border border-brand-gold bg-brand-champagne/20 px-3 py-2 text-left text-sm'
                      : 'rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800'
                  }
                  onClick={() => toggleServiceId(service.id)}
                >
                  <div className="font-medium text-slate-900 dark:text-slate-50">{service.name}</div>
                  <div className="text-xs text-slate-500">{Number(service.price ?? 0).toFixed(2)} KM</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Početak</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Kraj</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Napomena</Label>
          <Textarea rows={4} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/stylist/schedule')}>
            Odustani
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
            {saving ? 'Kreiranje...' : 'Kreiraj termin'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
