import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { formatLocalizedNumber, getIntlLocale } from '../../../i18n/locale-utils.mjs'
import { useReschedulePreview } from '../hooks/useReschedulePreview'
import { RescheduleOptionsCard } from '../components/reschedule-options-card'
import { RescheduleProposalList } from '../components/reschedule-proposal-list'
import { RescheduleConfirmDialog } from '../components/reschedule-confirm-dialog'

/**
 * Pregled promjene termina (S10) — **tanka kompozicija**.
 *
 * Stanje i tok su u `hooks/useReschedulePreview.ts`, a prikaz je podijeljen u
 * tri komponente (`components/reschedule-*.tsx`).
 *
 * Početne vrijednosti i dalje dolaze **iz URL-a** (`includeBreaks`, `mode`,
 * `manualShiftMinutes`) — korisnik ne odgovara na isto pitanje dvaput (3.3.7).
 */
export const WorkbookReschedulePreviewPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const navigate = useNavigate()
  const preview = useReschedulePreview()

  if (preview.loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-20">
        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-content-muted" aria-hidden="true" />
        <span className="text-sm text-content-muted">{t('common.loading')}</span>
      </div>
    )
  }

  if (preview.proposalLoadError) {
    return (
      <Card className="p-5" role="alert">
        <p className="text-content-strong">
          {t('stylistWorkbook.reschedule.previewLoadFailed')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void preview.fetchProposal()}>
            {t('common.retry')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            {t('common.back')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-content">
            {t('stylistWorkbook.reschedule.title')}
          </h1>
          <p className="mt-1 text-sm text-content-strong">
            {t('stylistWorkbook.reschedule.summary', {
              delay: formatLocalizedNumber(
                preview.proposal?.overrunMinutes ?? preview.proposal?.delayMinutes ?? 0,
                locale,
                { maximumFractionDigits: 0 },
              ),
              shift: formatLocalizedNumber(preview.totalShift, locale, {
                maximumFractionDigits: 0,
              }),
            })}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={preview.submitting}>
          {t('common.back')}
        </Button>
      </div>

      <RescheduleOptionsCard
        mode={preview.mode}
        onModeChange={preview.setMode}
        manualShiftMinutes={preview.manualShiftMinutes}
        onManualShiftMinutesChange={preview.setManualShiftMinutes}
        includeBreaks={preview.includeBreaks}
        onIncludeBreaksChange={preview.setIncludeBreaks}
        submitting={preview.submitting}
        onRefresh={() => void preview.fetchProposal()}
      />

      <RescheduleProposalList
        items={preview.items}
        hasChanges={preview.hasChanges}
        mode={preview.mode}
        submitting={preview.submitting}
        locale={locale}
        onApply={() => preview.setConfirmOpen(true)}
      />

      <RescheduleConfirmDialog
        open={preview.confirmOpen}
        onOpenChange={preview.setConfirmOpen}
        submitting={preview.submitting}
        onConfirm={() => void preview.handleCommit()}
      />
    </div>
  )
}
