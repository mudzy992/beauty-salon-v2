import { useMemo, useState } from 'react'

import { useStylistProfileMe } from './useStylistProfileMe'
import { useWorkbookNewEntryCatalog } from './useWorkbookNewEntryCatalog'
import type { CatalogService } from './useWorkbookNewEntryCatalog'
import { useWorkbookNewEntryLoyalty } from './useWorkbookNewEntryLoyalty'
import { useWorkbookNewEntrySubmission } from './useWorkbookNewEntrySubmission'
import type { ClientOption, ServiceOption } from '../types'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'

export type { CatalogService } from './useWorkbookNewEntryCatalog'
export type { NewEntrySubmitResult } from './useWorkbookNewEntrySubmission'

/** Kompozicija stanja forme: katalog, lojalnost/obračun i submission hook.
 * API sloj ostaje neizmijenjen; ponašanje i payload su očuvani.
 */
export const useWorkbookNewEntryForm = () => {
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()

  const [date, setDate] = useState(() => getSalonDateOnly())
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const clientId = selectedClient?.id ?? ''
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')

  const catalog = useWorkbookNewEntryCatalog({
    selectedClient,
    clientGender: selectedClient?.gender,
  })
  const loyalty = useWorkbookNewEntryLoyalty({ clientId, serviceIds })
  const { services } = catalog

  const selectedServices = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as CatalogService[],
    [services, serviceIds],
  )
  const basePrice = selectedServices.reduce((acc, s) => acc + Number(s.price ?? 0), 0)
  const loyaltyDiscountAmount = basePrice > 0 ? (basePrice * loyalty.loyaltyPercent) / 100 : 0
  const chargeAmount = Math.max(0, basePrice - loyaltyDiscountAmount)

  const toggleService = (svc: ServiceOption) => {
    setServiceIds((prev) => {
      const exists = prev.includes(svc.id)
      return exists ? prev.filter((x) => x !== svc.id) : [...prev, svc.id]
    })
    loyalty.resetLoyaltyPercent()
    setPaidAmount('')
  }

  const handleSelectClient = (c: ClientOption) => {
    setSelectedClient(c)
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username
    catalog.setClientSearch(name)
    catalog.setShowClientDropdown(false)
    if (
      c.gender &&
      selectedServices.length > 0 &&
      selectedServices.some((s) => s.gender !== c.gender)
    ) {
      setServiceIds([])
      catalog.setServiceSearch('')
    }
    loyalty.resetLoyaltyPercent()
    setPaidAmount('')
  }

  /** Pretraga klijenta briše prethodni odabir (i usluge, i popust). */
  const handleClientSearchChange = (value: string) => {
    catalog.setClientSearch(value)
    catalog.setShowClientDropdown(true)
    setSelectedClient(null)
    setServiceIds([])
    catalog.setServiceSearch('')
    loyalty.resetLoyaltyPercent()
    setPaidAmount('')
  }

  /** Promjena pretrage usluga ne mijenja odabir. */
  const handleServiceSearchChange = (value: string) => {
    catalog.setServiceSearch(value)
    catalog.setShowServiceDropdown(true)
  }

  const handleDesiredLoyaltyPercentChange = (value: number) => {
    loyalty.handleDesiredLoyaltyPercentChange(value)
    setPaidAmount('')
  }

  const submission = useWorkbookNewEntrySubmission({
    profileId,
    clientId,
    selectedClient,
    serviceIds,
    date,
    paidAmount,
    notes,
    chargeAmount,
    loyaltyPercent: loyalty.loyaltyPercent,
  })

  return {
    profileId,
    profileLoading,
    loading: catalog.loading,
    saving: submission.saving,
    services: catalog.services,
    clients: catalog.clients,
    date,
    setDate,
    serviceIds,
    selectedClient,
    clientId,
    paidAmount,
    setPaidAmount,
    notes,
    setNotes,
    partialOpen: submission.partialOpen,
    setPartialOpen: submission.setPartialOpen,
    partialDiff: submission.partialDiff,
    pendingPaidRaw: submission.pendingPaidRaw,
    loyaltyInfo: loyalty.loyaltyInfo,
    desiredLoyaltyPercent: loyalty.desiredLoyaltyPercent,
    handleDesiredLoyaltyPercentChange,
    loadingLoyalty: loyalty.loadingLoyalty,
    serviceSearch: catalog.serviceSearch,
    handleServiceSearchChange,
    clientSearch: catalog.clientSearch,
    handleClientSearchChange,
    showServiceDropdown: catalog.showServiceDropdown,
    setShowServiceDropdown: catalog.setShowServiceDropdown,
    showClientDropdown: catalog.showClientDropdown,
    setShowClientDropdown: catalog.setShowClientDropdown,
    serviceDropdownRef: catalog.serviceDropdownRef,
    clientDropdownRef: catalog.clientDropdownRef,
    selectedServices,
    filteredServices: catalog.filteredServices,
    filteredClients: catalog.filteredClients,
    basePrice,
    loyaltyPercent: loyalty.loyaltyPercent,
    loyaltyDiscountAmount,
    chargeAmount,
    toggleService,
    handleSelectClient,
    handleSubmit: submission.handleSubmit,
    confirmPartialPayment: submission.confirmPartialPayment,
  }
}
