import { ChangeEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { MediaImage } from '../../../components/media-image'
import { getUploadUrl } from '../../../utils/uploadUrl'
import { formatDateOnlyLocale } from '../../../../../shared/business-date.mjs'
import { formatLocalizedAmount, getIntlLocale } from '../../../i18n/locale-utils.mjs'
import {
  attachDailyLogImage,
  completeDailyLogEntry,
  proposeReschedule,
  uploadDailyLogImage,
} from '../api/stylist-workbook.api'
import { useWorkbookEntry } from '../hooks/useWorkbookEntry'
import { DailyLogDispositionPanel } from '../components/daily-log-disposition-panel'
import { getCollectedTotal, getSettledDebtsSum } from '../workbook-display'

const formatKm = (v: number, language: string) => formatLocalizedAmount(Number(v || 0), language)

export const WorkbookDetailPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const navigate = useNavigate()
  const { entryId } = useParams()
  const { toastApiError, success, warning } = useAppToast()

  const id = String(entryId ?? '')
  const { entry, isLoading, isFetching, refetch, error: entryError } = useWorkbookEntry(id)

  const [acting, setActing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const [reschedulePromptOpen, setReschedulePromptOpen] = useState(false)
  const [rescheduleReservationId, setRescheduleReservationId] = useState<string | null>(null)
  const [rescheduleOverrunLabel, setRescheduleOverrunLabel] = useState<number>(0)

  const canComplete = entry?.status !== 'COMPLETED'
  const beforeImages = useMemo(() => entry?.images?.filter((i) => i.isBefore) ?? [], [entry?.images])
  const afterImages = useMemo(() => entry?.images?.filter((i) => i.isAfter) ?? [], [entry?.images])
  const hasBeforeAfter = beforeImages.length > 0 || afterImages.length > 0

  const handleUpload = async (isBefore: boolean, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!entry) return
    setUploading(true)
    try {
      const upload = await uploadDailyLogImage(file)
      await attachDailyLogImage({
        entryId: entry.id,
        body: { uploadId: upload.id, isBefore, isAfter: !isBefore },
      })
      success(
        t('stylistWorkbook.detail.imageAddedTitle'),
        t('stylistWorkbook.detail.imageAddedMessage'),
      )
      await refetch()
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.detail.imageUploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleComplete = async () => {
    if (!entry) return
    setConfirmOpen(false)
    setActing(true)
    const reservationId = entry.reservationId ?? null
    try {
      await completeDailyLogEntry(entry.id)
      await refetch()

      if (!reservationId) {
        success(
          t('stylistWorkbook.detail.completedTitle'),
          t('stylistWorkbook.detail.completedMessage'),
        )
        return
      }

      try {
        const proposal = await proposeReschedule({
          reservationId,
          includeBreaks: false,
          mode: 'actual_overrun',
        })

        const delay = proposal?.delayMinutes ?? 0
        const itemCount = proposal?.items?.length ?? 0
        const overrunLabel = proposal?.overrunMinutes ?? delay

        if (delay > 0 && itemCount > 0) {
          setRescheduleReservationId(reservationId)
          setRescheduleOverrunLabel(overrunLabel)
          setReschedulePromptOpen(true)
          return
        }

        if (delay > 0 && itemCount === 0) {
          warning(
            t('stylistWorkbook.detail.latenessTitle'),
            t('stylistWorkbook.detail.noRescheduleNeeded', { minutes: overrunLabel }),
          )
        }
      } catch {
        // optional step: ignore errors (matches mobile)
      }
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.detail.actionFailed'))
    } finally {
      setActing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    )
  }

  const entryNotFound = isAxiosError(entryError) && entryError.response?.status === 404

  if (!entry) {
    return (
      <Card className="p-6" role={entryError && !entryNotFound ? 'alert' : undefined}>
        <p className="text-slate-900 dark:text-slate-50 font-semibold">
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 truncate">
            {entry.publicReferenceCode ?? entry.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {entry.date?.slice(0, 10)
              ? formatDateOnlyLocale(entry.date.slice(0, 10), locale)
              : '—'}{' '}
            {entry.isManual
              ? t('stylistWorkbook.detail.manualEntry')
              : t('stylistWorkbook.detail.reservationEntry')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching
              ? t('stylistWorkbook.refreshing')
              : t('stylistWorkbook.refresh')}
          </Button>
          <Link to="/stylist/workbook">
            <Button type="button" variant="outline">
              {t('common.back')}
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3 w-full">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {t('stylistWorkbook.detail.services')}
              </p>
              <ul className="mt-1 space-y-1">
                {(entry.items && entry.items.length > 0
                  ? entry.items
                  : entry.service
                    ? [{ serviceId: entry.serviceId, service: entry.service, unitPrice: entry.actualPrice }]
                    : []
                ).map((it) => (
                  <li
                    key={it.serviceId}
                    className="flex justify-between text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span>{it.service?.name ?? t('stylistWorkbook.serviceFallback')}</span>
                    <span>{formatKm(Number(it.unitPrice ?? 0), i18n.language)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {(entry.debtPaymentEntries?.length ?? 0) > 0 ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {t('stylistWorkbook.detail.debtPayments')}
                </p>
                <ul className="mt-1 space-y-1">
                  {entry.debtPaymentEntries!.map((dp) => (
                    <li
                      key={dp.id}
                      className="flex justify-between text-sm text-slate-700 dark:text-slate-200"
                    >
                      <span>
                        {dp.debt?.service?.name ??
                          dp.service?.name ??
                          t('stylistWorkbook.detail.debtFallback')}
                        {dp.debt?.createdAt
                          ? ` · ${formatDateOnlyLocale(String(dp.debt.createdAt).slice(0, 10), locale)}`
                          : ''}
                      </span>
                      <span>{formatKm(Number(dp.actualPrice), i18n.language)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {t('stylistWorkbook.detail.client')}
              <span className="font-medium text-slate-900 dark:text-slate-50">
                {entry.client
                  ? [entry.client.firstName, entry.client.lastName].filter(Boolean).join(' ') ||
                    entry.client.user?.username ||
                    '—'
                  : '—'}
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {t('stylistWorkbook.detail.totalCollected')}
              <span className="font-semibold text-slate-900 dark:text-slate-50">
                {formatKm(getCollectedTotal(entry), i18n.language)}
              </span>
              <span className="block text-xs mt-1">
                {t('stylistWorkbook.detail.servicesAmount', {
                  amount: formatKm(Number(entry.actualPrice), i18n.language),
                })}
                {getSettledDebtsSum(entry) > 0
                  ? ` · ${t('stylistWorkbook.detail.debtsAmount', {
                      amount: formatKm(getSettledDebtsSum(entry), i18n.language),
                    })}`
                  : ''}
                {Number(entry.tipAmount) > 0
                  ? ` · ${t('stylistWorkbook.detail.tipAmount', {
                      amount: formatKm(Number(entry.tipAmount), i18n.language),
                    })}`
                  : ''}
              </span>
            </div>
            {entry.notes ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {t('stylistWorkbook.detail.notes')}:{' '}
                <span className="text-slate-900 dark:text-slate-50">{entry.notes}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={entry.status === 'COMPLETED' ? 'success' : 'warning'}>
              {entry.status === 'COMPLETED'
                ? t('stylistWorkbook.completed')
                : t('stylistWorkbook.pending')}
            </Badge>
            {canComplete ? (
              <Button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={acting}
                className="whitespace-nowrap"
              >
                {acting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    {t('stylistWorkbook.detail.finishing')}
                  </>
                ) : entry.reservationId ? (
                  t('stylistWorkbook.detail.finishWithReservation')
                ) : (
                  t('stylistWorkbook.detail.finishEntry')
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {(canComplete || hasBeforeAfter) ? (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {t('stylistWorkbook.detail.beforeAfter')}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t('stylistWorkbook.detail.beforeAfterHint')}
              </p>
            </div>
          </div>

          {beforeImages.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('stylistWorkbook.detail.before')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {beforeImages.map((img) => {
                  const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal)
                  return (
                    <MediaImage
                      key={img.id}
                      src={uri}
                      alt={t('stylistWorkbook.detail.before')}
                      className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                      loading="lazy"
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {afterImages.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('stylistWorkbook.detail.after')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {afterImages.map((img) => {
                  const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal)
                  return (
                    <MediaImage
                      key={img.id}
                      src={uri}
                      alt={t('stylistWorkbook.detail.after')}
                      className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                      loading="lazy"
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {canComplete ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleUpload(true, e)}
                  disabled={uploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading}>
                  {uploading
                    ? t('stylistWorkbook.detail.uploading')
                    : t('stylistWorkbook.detail.addBefore')}
                </Button>
              </label>
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleUpload(false, e)}
                  disabled={uploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading}>
                  {uploading
                    ? t('stylistWorkbook.detail.uploading')
                    : t('stylistWorkbook.detail.addAfter')}
                </Button>
              </label>
              {uploading ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('stylistWorkbook.detail.uploadInProgress')}
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      <DailyLogDispositionPanel
        entry={entry}
        onDone={() => {
          void refetch()
          navigate('/stylist/workbook')
        }}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stylistWorkbook.detail.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {entry.reservationId
                ? t('stylistWorkbook.detail.confirmReservation')
                : t('stylistWorkbook.detail.confirmEntry')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={acting}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleComplete()} disabled={acting}>
              {acting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('stylistWorkbook.detail.finishing')}
                </>
              ) : (
                t('stylistWorkbook.detail.finish')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reschedulePromptOpen}
        onOpenChange={(v) => {
          setReschedulePromptOpen(v)
          if (!v) {
            setRescheduleReservationId(null)
            setRescheduleOverrunLabel(0)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stylistWorkbook.detail.latenessTitle')}</DialogTitle>
            <DialogDescription>
              {t('stylistWorkbook.detail.latenessDescription', {
                minutes: rescheduleOverrunLabel,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setReschedulePromptOpen(false)
              }}
            >
              {t('stylistWorkbook.detail.notNow')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!rescheduleReservationId) return
                navigate(
                  `/stylist/workbook/reschedule-preview/${rescheduleReservationId}?includeBreaks=0`,
                )
              }}
            >
              {t('stylistWorkbook.detail.withoutBreaks')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!rescheduleReservationId) return
                navigate(
                  `/stylist/workbook/reschedule-preview/${rescheduleReservationId}?includeBreaks=1`,
                )
              }}
            >
              {t('stylistWorkbook.detail.includeBreaks')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

