import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Drawer, DrawerContent } from '../../components/ui/drawer'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { DailyLogEntryFormFields } from './entry-form-fields'
import type {
  ClientDebtOption,
  ClientOption,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
  StylistOption,
} from './types'
import { defaultUnitPrice } from './form-helpers'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editId: string | null
  form: DailyLogFormState
  setForm: React.Dispatch<React.SetStateAction<DailyLogFormState>>
  stylists: StylistOption[]
  services: ServiceOption[]
  clients: ClientOption[]
  paidAmount: string
  setPaidAmount: (v: string) => void
  chargeAmount: number
  debtsSum: number
  tipPreview: number
  shortfall: number
  createDebt: boolean
  setCreateDebt: (v: boolean) => void
  openDebts: ClientDebtOption[]
  settleDebtsEnabled: boolean
  setSettleDebtsEnabled: (v: boolean) => void
  settledDebtIds: string[]
  onToggleSettledDebt: (id: string) => void
  setUnitPrice: (serviceId: string, value: number) => void
  toggleService: (svc: ServiceOption) => void
  loyaltyPercent: number
  loyaltyDiscountAmount: number
  loyaltyInfo: LoyaltyInfo | null
  loadingLoyalty: boolean
  saving: boolean
  onSave: () => void
  cancelLabel: string
  saveLabel: string
}

export const DailyLogEntryFormDialog = (props: Props) => {
  const { t } = useTranslation()
  const {
    open,
    onOpenChange,
    editId,
    form,
    setForm,
    stylists,
    services,
    clients,
    paidAmount,
    setPaidAmount,
    chargeAmount,
    debtsSum,
    tipPreview,
    shortfall,
    createDebt,
    setCreateDebt,
    openDebts,
    settleDebtsEnabled,
    setSettleDebtsEnabled,
    settledDebtIds,
    onToggleSettledDebt,
    setUnitPrice,
    toggleService,
    loyaltyPercent,
    loyaltyDiscountAmount,
    loyaltyInfo,
    loadingLoyalty,
    saving,
    onSave,
    cancelLabel,
    saveLabel,
  } = props
  const isMobile = useIsMobile()
  const [serviceSearch, setServiceSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const client = clients.find((c) => c.id === form.clientId)
    setClientSearch(
      client
        ? [client.firstName, client.lastName].filter(Boolean).join(' ') ||
            client.username
        : '',
    )
    setServiceSearch('')
  }, [open, editId, form.clientId, clients])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (
        showServiceDropdown &&
        serviceDropdownRef.current &&
        target &&
        !serviceDropdownRef.current.contains(target)
      ) {
        setShowServiceDropdown(false)
      }
      if (
        showClientDropdown &&
        clientDropdownRef.current &&
        target &&
        !clientDropdownRef.current.contains(target)
      ) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showServiceDropdown, showClientDropdown])

  const filteredServices = useMemo(() => {
    const selectedClient = clients.find((c) => c.id === form.clientId)
    const base = selectedClient?.gender
      ? services.filter((s) => s.gender === selectedClient.gender)
      : services
    if (!serviceSearch) return base
    const q = serviceSearch.toLowerCase()
    return base.filter((s) => s.name.toLowerCase().includes(q))
  }, [clients, form.clientId, services, serviceSearch])

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 40)
    const q = clientSearch.toLowerCase()
    return clients
      .filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          (c.firstName?.toLowerCase().includes(q) ?? false) ||
          (c.lastName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 40)
  }, [clients, clientSearch])

  const selectedServices = useMemo(
    () =>
      form.serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter(Boolean) as ServiceOption[],
    [services, form.serviceIds],
  )

  const onToggleService = (svc: ServiceOption) => {
    toggleService(svc)
    setForm((prev) => ({ ...prev, desiredLoyaltyPercent: 0 }))
  }

  const onSelectClient = (client: ClientOption) => {
    setForm((prev) => {
      const currentSelected = prev.serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter(Boolean) as ServiceOption[]
      const hasMismatch =
        client.gender &&
        currentSelected.length > 0 &&
        currentSelected.some((s) => s.gender && s.gender !== client.gender)
      const nextIds = hasMismatch ? [] : prev.serviceIds
      const nextPrices = hasMismatch
        ? {}
        : Object.fromEntries(
            nextIds.map((id) => {
              const svc = services.find((s) => s.id === id)
              return [id, prev.unitPrices[id] ?? (svc ? defaultUnitPrice(svc) : 0)]
            }),
          )
      return {
        ...prev,
        clientId: client.id,
        desiredLoyaltyPercent: 0,
        serviceIds: nextIds,
        unitPrices: nextPrices,
      }
    })
    setClientSearch(
      [client.firstName, client.lastName].filter(Boolean).join(' ') || client.username,
    )
    setShowClientDropdown(false)
  }

  const fields = (
    <DailyLogEntryFormFields
      editId={editId}
      form={form}
      setForm={setForm}
      stylists={stylists}
      selectedServices={selectedServices}
      filteredServices={filteredServices}
      filteredClients={filteredClients}
      serviceSearch={serviceSearch}
      setServiceSearch={setServiceSearch}
      clientSearch={clientSearch}
      setClientSearch={setClientSearch}
      showServiceDropdown={showServiceDropdown}
      setShowServiceDropdown={setShowServiceDropdown}
      showClientDropdown={showClientDropdown}
      setShowClientDropdown={setShowClientDropdown}
      serviceDropdownRef={serviceDropdownRef}
      clientDropdownRef={clientDropdownRef}
      paidAmount={paidAmount}
      setPaidAmount={setPaidAmount}
      chargeAmount={chargeAmount}
      debtsSum={debtsSum}
      tipPreview={tipPreview}
      shortfall={shortfall}
      createDebt={createDebt}
      setCreateDebt={setCreateDebt}
      openDebts={openDebts}
      settleDebtsEnabled={settleDebtsEnabled}
      setSettleDebtsEnabled={setSettleDebtsEnabled}
      settledDebtIds={settledDebtIds}
      onToggleSettledDebt={onToggleSettledDebt}
      setUnitPrice={setUnitPrice}
      loyaltyPercent={loyaltyPercent}
      loyaltyDiscountAmount={loyaltyDiscountAmount}
      loyaltyInfo={loyaltyInfo}
      loadingLoyalty={loadingLoyalty}
      onToggleService={onToggleService}
      onSelectClient={onSelectClient}
      saving={saving}
      onSave={onSave}
      onCancel={() => onOpenChange(false)}
      cancelLabel={cancelLabel}
      saveLabel={saveLabel}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent side="right" className="max-w-lg overflow-y-auto p-4">
          <h2 className="mb-4 text-lg font-semibold">
            {editId ? t('dailyLog.editEntry') : t('dailyLog.newEntry')}
          </h2>
          {fields}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? t('dailyLog.editEntry') : t('dailyLog.newEntry')}</DialogTitle>
        </DialogHeader>
        {fields}
      </DialogContent>
    </Dialog>
  )
}
