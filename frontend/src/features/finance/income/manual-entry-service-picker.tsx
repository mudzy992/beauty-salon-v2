import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import { Select } from '../../../components/ui/select'
import type { ServiceOption } from '../finance.types'

type Props = {
  open: boolean
  stylistId: string
  value: string
  services: ServiceOption[]
  isLoading: boolean
  hasError: boolean
  retry: () => Promise<{ isSuccess: boolean }>
  onChange: (serviceId: string) => void
  formatAmount: (value: number | string) => string
  selectClass: string
}

// A new keyed instance for each stylist prevents an old retry from changing the
// new stylist's focus or loading state when its response arrives late.
export function ManualEntryServicePicker({
  open,
  stylistId,
  value,
  services,
  isLoading,
  hasError,
  retry,
  onChange,
  formatAmount,
  selectClass,
}: Props) {
  const { t } = useTranslation()
  const loadingId = useId()
  const errorId = useId()
  const selectRef = useRef<HTMLSelectElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const mounted = useRef(false)
  const inFlight = useRef(false)
  const pendingFocus = useRef(false)
  const [retrying, setRetrying] = useState(false)
  const loading = Boolean(stylistId) && (isLoading || retrying)
  const error = Boolean(stylistId) && hasError && !loading

  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useLayoutEffect(() => {
    if (retrying || !pendingFocus.current) return
    pendingFocus.current = false
    if (open && (document.activeElement === document.body || document.activeElement === retryRef.current)) {
      selectRef.current?.focus()
    }
  }, [open, retrying])
  const retryServices = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRetrying(true)
    try {
      const result = await retry()
      if (mounted.current && result.isSuccess && document.activeElement === retryRef.current) {
        pendingFocus.current = true
      }
    } finally {
      inFlight.current = false
      if (mounted.current) setRetrying(false)
    }
  }

  return (
    <div className="grid gap-1">
      <Label htmlFor="manual-service">{t('finance.manualEntry.service')}</Label>
      <Select
        id="manual-service"
        ref={selectRef}
        className={selectClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!stylistId || loading || error}
        aria-describedby={loading ? loadingId : error ? errorId : undefined}
      >
        <option value="">
          {stylistId ? t('finance.manualEntry.selectService') : t('finance.manualEntry.selectStylistFirst')}
        </option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name} · {formatAmount(service.price ?? 0)}
          </option>
        ))}
      </Select>
      {loading ? (
        <p id={loadingId} role="status" className="text-xs text-content-strong">
          {t('finance.manualEntry.loadingServices')}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-content">
          {t('finance.manualEntry.servicesLoadError')}
        </p>
      ) : null}
      {error || retrying ? (
        <Button
          ref={retryRef}
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          aria-disabled={retrying || undefined}
          onClick={() => void retryServices()}
        >
          {t('finance.manualEntry.retryServices')}
        </Button>
      ) : null}
    </div>
  )
}
