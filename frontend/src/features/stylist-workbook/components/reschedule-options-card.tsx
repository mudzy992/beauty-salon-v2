import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { cn } from '../../../lib/cn'
import type { RescheduleMode } from '../types'

/**
 * Opcije promjene termina (S10).
 *
 * Izdvojeno iz `pages/workbook-reschedule-preview-page.tsx` **bez promjene**:
 * isti tri režima, isto ručno unosljeno pomjeranje (min. 3 znaka, vezano
 * labelom preko `useId`), isti preklopnik za „uključi pauze" sa `role="switch"`
 * i `aria-checked`, i isto dugme za osvježavanje pregleda.
 */
export const RescheduleOptionsCard = ({
  mode,
  onModeChange,
  manualShiftMinutes,
  onManualShiftMinutesChange,
  includeBreaks,
  onIncludeBreaksChange,
  submitting,
  onRefresh,
}: {
  mode: RescheduleMode
  onModeChange: (mode: RescheduleMode) => void
  manualShiftMinutes: string
  onManualShiftMinutesChange: (value: string) => void
  includeBreaks: boolean
  onIncludeBreaksChange: (value: boolean) => void
  submitting: boolean
  onRefresh: () => void
}) => {
  const { t } = useTranslation()
  const formId = useId()
  const manualShiftId = `${formId}-manual-shift`

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'actual_overrun' ? 'default' : 'outline'}
            className={cn(mode === 'actual_overrun' ? '' : '')}
            onClick={() => onModeChange('actual_overrun')}
            disabled={submitting}
          >
            {t('stylistWorkbook.reschedule.actualOverrun')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'manual_minutes' ? 'default' : 'outline'}
            onClick={() => onModeChange('manual_minutes')}
            disabled={submitting}
          >
            {t('stylistWorkbook.reschedule.manualMinutes')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'use_break_only' ? 'default' : 'outline'}
            onClick={() => onModeChange('use_break_only')}
            disabled={submitting}
          >
            {t('stylistWorkbook.reschedule.useBreakOnly')}
          </Button>
        </div>

        {mode === 'manual_minutes' ? (
          <div>
            <Label htmlFor={manualShiftId}>{t('stylistWorkbook.reschedule.manualShift')}</Label>
            <Input
              id={manualShiftId}
              className="mt-2 max-w-[220px]"
              inputMode="numeric"
              value={manualShiftMinutes}
              onChange={(e) => onManualShiftMinutesChange(e.target.value)}
              disabled={submitting}
            />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3 rounded-lg border border-line p-4">
          <div>
            <p className="text-sm font-semibold text-content">
              {t('stylistWorkbook.reschedule.includeFutureBreaks')}
            </p>
            <p className="mt-1 text-sm text-content-strong">
              {t('stylistWorkbook.reschedule.breaksDescription')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeBreaks}
            aria-label={t('stylistWorkbook.reschedule.includeFutureBreaks')}
            className={cn(
              'h-6 w-11 rounded-full border transition-colors flex items-center px-0.5',
              includeBreaks
                ? 'bg-surface-inverse border-surface-inverse'
                : 'bg-surface-muted border-line',
            )}
            onClick={() => onIncludeBreaksChange(!includeBreaks)}
            disabled={submitting}
          >
            {/* Aurum: dugme preklopnika koristi `bg-surface` — isti token kao zajednički
                Radix `Switch` thumb (`components/ui/switch.tsx`), pa je kontrast na
                aktiviranom (`bg-surface-inverse`) i neaktiviranom (`bg-surface-muted`)
                track-u jednak u sve tri teme. */}
            <span
              className={cn(
                'h-5 w-5 rounded-full bg-surface transition-transform',
                includeBreaks ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={submitting}
          >
            {t('stylistWorkbook.reschedule.refreshPreview')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
