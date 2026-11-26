import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { formatDateOnlyLocale } from '../../../../../shared/business-date.mjs'
import { getIntlLocale } from '../../../i18n/locale-utils.mjs'
import { useWorkbookEntry } from '../hooks/useWorkbookEntry'
import { useWorkbookDetailActions } from '../hooks/useWorkbookDetailActions'
import { DailyLogDispositionPanel } from '../components/daily-log-disposition-panel'
import { WorkbookDetailSummaryCard } from '../components/workbook-detail-summary-card'
import { WorkbookDetailImagesCard } from '../components/workbook-detail-images-card'
import { WorkbookDetailCompleteDialog } from '../components/workbook-detail-complete-dialog'
import { WorkbookDetailLatenessDialog } from '../components/workbook-detail-lateness-dialog'

/**
 * Detalj unosa u dnevnoj knjizi (S10) — **tanka kompozicija**.
 *
 * Akcije (upload slika, završetak unosa, ponuda za promjenu termina) su u
 * `hooks/useWorkbookDetailActions.ts`, a prikaz je podijeljen u četiri
 * komponente (`components/workbook-detail-*.tsx`).
 *
 * Sve poruke, validacije, redoslijed koraka i notifikacije su **identični**
 * ranijem monolitnom fajlu — razlika je samo u tome gdje se nalaze.
 */
export const WorkbookDetailPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const navigate = useNavigate()
  const { entryId } = useParams()

  const id = String(entryId ?? '')
  const { entry, isLoading, isFetching, refetch, error: entryError } = useWorkbookEntry(id)

  const actions = useWorkbookDetailActions({
    entry,
    refetch: () => refetch(),
    onReschedulePreview: (reservationId, includeBreaks) => {
      // Izbor se prenosi **URL-om** (3.3.7) — preview stranica čita isti
      // parametar `includeBreaks` i ne pita korisnika ponovo.
      navigate(
        includeBreaks
          ? `/stylist/workbook/reschedule-preview/${reservationId}?includeBreaks=1`
          : `/stylist/workbook/reschedule-preview/${reservationId}?includeBreaks=0`,
      )
    },
  })

  const canComplete = entry?.status !== 'COMPLETED'
  const beforeImages = useMemo(() => entry?.images?.filter((i) => i.isBefore) ?? [], [entry?.images])
  const afterImages = useMemo(() => entry?.images?.filter((i) => i.isAfter) ?? [], [entry?.images])
  const hasBeforeAfter = beforeImages.length > 0 || afterImages.length > 0

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-20">
        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-content-muted" aria-hidden="true" />
        <span className="text-sm text-content-muted">{t('common.loading')}</span>
      </div>
    )
  }

  const entryNotFound = isAxiosError(entryError) && entryError.response?.status === 404

  if (!entry) {
    return (
      <Card className="p-6" role={entryError && !entryNotFound ? 'alert' : undefined}>
        <p className="text-content font-semibold">
          {entryError && !entryNotFound
            ? t('stylistWorkbook.detail.loadFailed')
            : t('stylistWorkbook.detail.notFound')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() =>
            entryError && !entryNotFound ? void refetch() : navigate('/stylist/workbook')
          }
        >
          {entryError && !entryNotFound ? t('common.retry') : t('common.back')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-content truncate">
            {entry.publicReferenceCode ?? entry.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-content-strong">
            {entry.date?.slice(0, 10)
              ? formatDateOnlyLocale(entry.date.slice(0, 10), locale)
              : '—'}{' '}
            {entry.isManual
              ? t('stylistWorkbook.detail.manualEntry')
              : t('stylistWorkbook.detail.reservationEntry')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-busy={isFetching}
          >
            {isFetching
              ? t('stylistWorkbook.refreshing')
              : t('stylistWorkbook.refresh')}
          </Button>
          <Button asChild variant="outline">
            <Link to="/stylist/workbook">{t('common.back')}</Link>
          </Button>
        </div>
      </div>

      <WorkbookDetailSummaryCard
        entry={entry}
        language={i18n.language}
        locale={locale}
        canComplete={canComplete}
        acting={actions.acting}
        onRequestComplete={() => actions.setConfirmOpen(true)}
      />

      {(canComplete || hasBeforeAfter) ? (
        <WorkbookDetailImagesCard
          beforeImages={beforeImages}
          afterImages={afterImages}
          canComplete={canComplete}
          uploading={actions.uploading}
          beforeDescription={actions.beforeDescription}
          onBeforeDescriptionChange={actions.setBeforeDescription}
          afterDescription={actions.afterDescription}
          onAfterDescriptionChange={actions.setAfterDescription}
          beforeFileRef={actions.beforeFileRef}
          afterFileRef={actions.afterFileRef}
          beforeButtonRef={actions.beforeButtonRef}
          afterButtonRef={actions.afterButtonRef}
          onUpload={actions.handleUpload}
        />
      ) : null}

      <DailyLogDispositionPanel
        entry={entry}
        onDone={() => {
          void refetch()
          navigate('/stylist/workbook')
        }}
      />

      <WorkbookDetailCompleteDialog
        open={actions.confirmOpen}
        onOpenChange={actions.setConfirmOpen}
        acting={actions.acting}
        hasReservation={!!entry.reservationId}
        onConfirm={() => void actions.handleComplete()}
      />

      <WorkbookDetailLatenessDialog
        open={actions.reschedulePromptOpen}
        onOpenChange={(v) => {
          actions.setReschedulePromptOpen(v)
          if (!v) {
            actions.setRescheduleReservationId(null)
            actions.setRescheduleOverrunLabel(0)
          }
        }}
        overrunMinutes={actions.rescheduleOverrunLabel}
        onNotNow={() => actions.setReschedulePromptOpen(false)}
        onPreview={(includeBreaks) => {
          if (!actions.rescheduleReservationId) return
          actions.onReschedulePreview(actions.rescheduleReservationId, includeBreaks)
        }}
      />
    </div>
  )
}
