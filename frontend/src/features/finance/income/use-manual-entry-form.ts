import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useClientSearch, useStylistServices, useStylists } from '../hooks/use-lookups'
import { getDefaultEntryDate, toNumber } from '../finance.utils'
import type {
  ClientOption,
  IncomeBookManualEntry,
  ManualEntryPayload,
} from '../finance.types'

export type ManualEntryFormState = {
  date: string
  stylistProfileId: string
  clientId: string
  serviceId: string
  paidAmount: string
  debtHandling: 'CREATE_DEBT' | 'IGNORE_DEBT'
  notes: string
}

const emptyForm = (year: number, month: number): ManualEntryFormState => ({
  date: getDefaultEntryDate(year, month),
  stylistProfileId: '',
  clientId: '',
  serviceId: '',
  paidAmount: '',
  debtHandling: 'IGNORE_DEBT',
  notes: '',
})

const toFormState = (
  entry: IncomeBookManualEntry,
): ManualEntryFormState => ({
  date: entry.date.slice(0, 10),
  stylistProfileId: entry.stylistProfileId ?? '',
  clientId: entry.clientId ?? '',
  serviceId: entry.serviceId,
  paidAmount: String(toNumber(entry.amount) + toNumber(entry.tipAmount)),
  debtHandling: 'IGNORE_DEBT',
  notes: entry.notes ?? '',
})

export const useManualEntryForm = (params: {
  open: boolean
  year: number
  month: number
  editing: IncomeBookManualEntry | null
}) => {
  const { t } = useTranslation()
  const [form, setForm] = useState<ManualEntryFormState>(() =>
    emptyForm(params.year, params.month),
  )
  const [clientQuery, setClientQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)

  useEffect(() => {
    if (!params.open) return
    if (params.editing) {
      setForm(toFormState(params.editing))
      setSelectedClient(params.editing.client ?? null)
      return
    }
    setForm(emptyForm(params.year, params.month))
    setSelectedClient(null)
    setClientQuery('')
  }, [params.open, params.editing, params.year, params.month])

  const stylistsQuery = useStylists(params.open)
  const servicesQuery = useStylistServices(form.stylistProfileId || null)
  const clientsQuery = useClientSearch(clientQuery)

  const servicePrice = useMemo(() => {
    const service = (servicesQuery.data ?? []).find((s) => s.id === form.serviceId)
    return toNumber(service?.price)
  }, [servicesQuery.data, form.serviceId])

  const paidAmount = form.paidAmount === '' ? 0 : Number(form.paidAmount)
  const debtAmount = Math.max(0, servicePrice - paidAmount)
  const tipAmount = Math.max(0, paidAmount - servicePrice)

  const update = (patch: Partial<ManualEntryFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const selectClient = (client: ClientOption | null) => {
    setSelectedClient(client)
    update({ clientId: client?.id ?? '' })
  }

  const canCreateDebt = Boolean(form.clientId && form.stylistProfileId)
  const validationError = (() => {
    if (!form.date) return t('finance.manualEntry.validation.dateRequired')
    if (!form.serviceId) return t('finance.manualEntry.validation.serviceRequired')
    if (form.paidAmount === '' || !Number.isFinite(paidAmount) || paidAmount < 0) {
      return t('finance.manualEntry.validation.validPaidAmount')
    }
    if (form.debtHandling === 'CREATE_DEBT' && debtAmount > 0 && !canCreateDebt) {
      return t('finance.manualEntry.validation.debtRequiresClientStylist')
    }
    return null
  })()

  const toPayload = (): ManualEntryPayload => ({
    date: form.date,
    serviceId: form.serviceId,
    stylistProfileId: form.stylistProfileId || undefined,
    clientId: form.clientId || undefined,
    paidAmount,
    debtHandling: form.debtHandling,
    notes: form.notes.trim() || undefined,
  })

  return {
    form,
    update,
    clientQuery,
    setClientQuery,
    selectedClient,
    selectClient,
    stylists: stylistsQuery.data ?? [],
    isLoadingStylists: stylistsQuery.isLoading,
    services: servicesQuery.data ?? [],
    isLoadingServices: servicesQuery.isLoading,
    clientResults: clientsQuery.data ?? [],
    isSearchingClients: clientsQuery.isFetching,
    servicePrice,
    paidAmount,
    debtAmount,
    tipAmount,
    canCreateDebt,
    validationError,
    toPayload,
  }
}
