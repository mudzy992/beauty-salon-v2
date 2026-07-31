import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Drawer, DrawerContent } from '../../components/ui/drawer'
import { DailyLogEntryFormFields } from './entry-form-fields'
import type {
  ClientOption,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
  StylistOption,
} from './types'

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
  loyaltyInfo: LoyaltyInfo | null
  loadingLoyalty: boolean
  saving: boolean
  onSave: () => void
  cancelLabel: string
  saveLabel: string
}

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

export const DailyLogEntryFormDialog = (props: Props) => {
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
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null)
  const clientDropdownRef = useRef<HTMLDivElement | null>(null)

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
    if (!clientSearch) return clients.slice(0, 20)
    const q = clientSearch.toLowerCase()
    return clients
      .filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          (c.firstName?.toLowerCase().includes(q) ?? false) ||
          (c.lastName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 20)
  }, [clients, clientSearch])

  const selectedServices = useMemo(
    () =>
      form.serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter(Boolean) as ServiceOption[],
    [services, form.serviceIds],
  )
  const basePrice = selectedServices.reduce((acc, s) => acc + Number(s.price ?? 0), 0)
  const loyaltyPercent =
    loyaltyInfo?.enabled &&
    loyaltyInfo?.hasAccount &&
    loyaltyInfo?.redeemEnabled &&
    loyaltyInfo?.service
      ? Math.max(
          0,
          Math.min(form.desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent),
        )
      : 0
  const loyaltyDiscountAmount = basePrice > 0 ? (basePrice * loyaltyPercent) / 100 : 0
  const chargeAmount = Math.max(0, basePrice - loyaltyDiscountAmount)

  const onToggleService = (svc: ServiceOption) => {
    setForm((prev) => {
      const exists = prev.serviceIds.includes(svc.id)
      const nextIds = exists
        ? prev.serviceIds.filter((x) => x !== svc.id)
        : [...prev.serviceIds, svc.id]
      return { ...prev, serviceIds: nextIds, desiredLoyaltyPercent: 0 }
    })
    setPaidAmount('')
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
      return {
        ...prev,
        clientId: client.id,
        desiredLoyaltyPercent: 0,
        serviceIds: hasMismatch ? [] : prev.serviceIds,
      }
    })
    setClientSearch(
      [client.firstName, client.lastName].filter(Boolean).join(' ') || client.username,
    )
    setShowClientDropdown(false)
    setPaidAmount('')
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
      basePrice={basePrice}
      loyaltyPercent={loyaltyPercent}
      loyaltyDiscountAmount={loyaltyDiscountAmount}
      chargeAmount={chargeAmount}
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
            {editId ? 'Uredi Unos' : 'Novi Unos u Dnevnu Knjigu'}
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
          <DialogTitle>{editId ? 'Uredi Unos' : 'Novi Unos u Dnevnu Knjigu'}</DialogTitle>
        </DialogHeader>
        {fields}
      </DialogContent>
    </Dialog>
  )
}
