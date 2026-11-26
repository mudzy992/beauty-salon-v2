import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { formatLocalizedNumber } from '../../../i18n/locale-utils.mjs'
import type { RescheduleProposal } from '../types'

type ProposalItem = NonNullable<RescheduleProposal['items']>[number]

/**
 * Lista promjena termina (S10).
 *
 * Izdvojeno iz `pages/workbook-reschedule-preview-page.tsx` **bez promjene**:
 * iste kartice sa starim i novim terminom, isti prikaz pomjeranja i skraćenih
 * pauza, i isti slučaj „nema promjena" (sa dugmadom za primjenu bez pomjeranja
 * u režimu „samo pauze").
 */
export const RescheduleProposalList = ({
  items,
  hasChanges,
  mode,
  submitting,
  locale,
  onApply,
}: {
  items: ProposalItem[]
  hasChanges: boolean
  mode: string
  submitting: boolean
  locale: string
  onApply: () => void
}) => {
  const { t } = useTranslation()

  if (!hasChanges) {
    return (
      <Card className="mt-4 p-5">
        <p className="text-base font-semibold text-content">
          {t('stylistWorkbook.reschedule.noChanges')}
        </p>
        <p className="mt-2 text-sm text-content-strong">
          {mode === 'use_break_only'
            ? t('stylistWorkbook.reschedule.breakOnlyDescription')
            : t('stylistWorkbook.reschedule.noMovableAppointments')}
        </p>
        {mode === 'use_break_only' ? (
          <Button
            type="button"
            className="mt-4"
            onClick={onApply}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {t('stylistWorkbook.reschedule.sending')}
              </>
            ) : (
              t('stylistWorkbook.reschedule.applyWithoutMove')
            )}
          </Button>
        ) : null}
      </Card>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((it) => (
        <Card key={it.id} className="p-5">
          <p className="text-sm font-semibold text-content">
            {it.serviceName || t('stylistWorkbook.serviceFallback')} {it.clientName ? `· ${it.clientName}` : ''}
          </p>
          <p className="mt-2 text-sm text-content-strong">
            {it.oldStartTime}–{it.oldEndTime} → {it.newStartTime}–{it.newEndTime}
          </p>
          <p className="mt-2 text-xs text-content-muted">
            {t('stylistWorkbook.reschedule.shift', {
              minutes: formatLocalizedNumber(it.shiftMinutes, locale, { maximumFractionDigits: 0 }),
            })}
            {typeof it.reducedBreakMinutes === 'number'
              ? ` · ${t('stylistWorkbook.reschedule.reducedBreaks', {
                  minutes: formatLocalizedNumber(it.reducedBreakMinutes, locale, { maximumFractionDigits: 0 }),
                })}`
              : ''}
          </p>
        </Card>
      ))}

      <Button
        type="button"
        className="mt-2"
        onClick={onApply}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {t('stylistWorkbook.reschedule.sending')}
          </>
        ) : (
          t('stylistWorkbook.reschedule.notifyClients')
        )}
      </Button>
    </div>
  )
}
