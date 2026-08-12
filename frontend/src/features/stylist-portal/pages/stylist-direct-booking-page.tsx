import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import api from '../../../api/client'
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
  const [clientId, setClientId] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [clientNotes, setClientNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get<ServiceOption[] | { items: ServiceOption[] }>('/api/services', {
        params: { page: 0, pageSize: 300, activeOnly: 'true' },
      })
      .then(({ data }) => setServices(Array.isArray(data) ? data : data.items ?? []))
      .catch(() => setServices([]))
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const q = clientSearch.trim()
      if (!q) {
        setClients([])
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
  }, [clientSearch])

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients],
  )

  const filteredServices = useMemo(() => {
    if (!selectedClient?.gender) return services
    return services.filter((service) => service.gender === selectedClient.gender)
  }, [selectedClient?.gender, services])

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

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await api.post('/api/reservations/stylist/direct', {
        clientId,
        serviceIds,
        reservationDate,
        startTime,
        endTime,
        clientNotes: clientNotes.trim() || undefined,
      })
      toast.success('Dogovoreni termin je kreiran')
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
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Dogovoreni termin</h1>
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
          <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Pretraži klijenta..." />
          {clients.length > 0 ? (
            <div className="grid gap-2">
              {clients.map((client) => {
                const label = [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.username
                return (
                  <button
                    key={client.id}
                    type="button"
                    className={clientId === client.id ? 'rounded-lg border border-brand-gold bg-brand-champagne/20 px-3 py-2 text-left text-sm' : 'rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800'}
                    onClick={() => {
                      setClientId(client.id)
                      setClientSearch(label)
                    }}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-50">{label}</div>
                    <div className="text-xs text-slate-500">{client.id}</div>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Servisi</Label>
          <div className="grid gap-2">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                type="button"
                className={serviceIds.includes(service.id) ? 'rounded-lg border border-brand-gold bg-brand-champagne/20 px-3 py-2 text-left text-sm' : 'rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800'}
                onClick={() => toggleServiceId(service.id)}
              >
                <div className="font-medium text-slate-900 dark:text-slate-50">{service.name}</div>
                <div className="text-xs text-slate-500">{Number(service.price ?? 0).toFixed(2)} KM</div>
              </button>
            ))}
          </div>
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
            disabled={saving || !clientId || serviceIds.length === 0 || !reservationDate || !startTime || !endTime}
            onClick={() => void handleSubmit()}
          >
            {saving ? 'Kreiranje...' : 'Kreiraj termin'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
