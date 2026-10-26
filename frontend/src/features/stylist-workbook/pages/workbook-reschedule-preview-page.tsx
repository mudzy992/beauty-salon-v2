import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { cn } from '../../../lib/cn'
import { formatLocalizedNumber, getIntlLocale } from '../../../i18n/locale-utils.mjs'
import { commitReschedule, proposeReschedule } from '../api/stylist-workbook.api'
import type { RescheduleMode, RescheduleProposal } from '../types'

const clampNonNegInt = (v: number) => Math.max(0, Math.floor(v))

export const WorkbookReschedulePreviewPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const [searchParams] = useSearchParams()
  const { toastApiError, success } = useAppToast()

  const id = String(reservationId ?? '')

  const initialIncludeBreaks = useMemo(() => {
    const v = searchParams.get('includeBreaks')
    return v === '1' || v === 'true'
  }, [searchParams])

  const initialMode = useMemo<RescheduleMode>(() => {
    const v = searchParams.get('mode')
    if (v === 'manual_minutes' || v === 'use_break_only' || v === 'actual_overrun') return v
    return 'actual_overrun'
  }, [searchParams])

  const initialManualShiftMinutes = useMemo(() => {
    const v = searchParams.get('manualShiftMinutes')
    const n = clampNonNegInt(parseInt(v || '0', 10) || 0)
    return String(n || 5)
  }, [searchParams])

  const [includeBreaks, setIncludeBreaks] = useState(initialIncludeBreaks)
  const [mode, setMode] = useState<RescheduleMode>(initialMode)
  const [manualShiftMinutes, setManualShiftMinutes] = useState(initialManualShiftMinutes)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [proposal, setProposal] = useState<RescheduleProposal | null>(null)
  const [proposalLoadError, setProposalLoadError] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const fetchProposal = async () => {
    setLoading(true)
    setProposalLoadError(false)
    try {
      const data = await proposeReschedule({
        reservationId: id,
        includeBreaks,
        mode,
        manualShiftMinutes:
          mode === 'manual_minutes'
            ? clampNonNegInt(parseInt(manualShiftMinutes || '0', 10) || 0)
            : undefined,
      })
      setProposal(data)
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.reschedule.recalculationFailed'))
      setProposal(null)
      setProposalLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    void fetchProposal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const items = proposal?.items ?? []
  const hasChanges = items.length > 0 && (proposal?.delayMinutes ?? 0) > 0
  const totalShift = items.length ? items[items.length - 1]?.shiftMinutes ?? 0 : 0

  const handleCommit = async () => {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      await commitReschedule({
        reservationId: id,
        includeBreaks,
        mode,
        manualShiftMinutes:
          mode === 'manual_minutes'
            ? clampNonNegInt(parseInt(manualShiftMinutes || '0', 10) || 0)
            : undefined,
      })
      success(
        t('stylistWorkbook.reschedule.sentTitle'),
        mode === 'use_break_only'
          ? t('stylistWorkbook.reschedule.breakOnlyApplied')
          : t('stylistWorkbook.reschedule.clientsNotified'),
      )
      navigate(-1)
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.reschedule.notifyFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    )
  }

  if (proposalLoadError) {
    return (
      <Card className="p-5" role="alert">
        <p className="text-slate-700 dark:text-slate-200">
          {t('stylistWorkbook.reschedule.previewLoadFailed')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void fetchProposal()}>
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {t('stylistWorkbook.reschedule.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('stylistWorkbook.reschedule.summary', {
              delay: formatLocalizedNumber(
                proposal?.overrunMinutes ?? proposal?.delayMinutes ?? 0,
                locale,
                { maximumFractionDigits: 0 },
              ),
              shift: formatLocalizedNumber(totalShift, locale, {
                maximumFractionDigits: 0,
              }),
            })}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
          {t('common.back')}
        </Button>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'actual_overrun' ? 'default' : 'outline'}
              className={cn(mode === 'actual_overrun' ? '' : '')}
              onClick={() => setMode('actual_overrun')}
              disabled={submitting}
            >
              {t('stylistWorkbook.reschedule.actualOverrun')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'manual_minutes' ? 'default' : 'outline'}
              onClick={() => setMode('manual_minutes')}
              disabled={submitting}
            >
              {t('stylistWorkbook.reschedule.manualMinutes')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'use_break_only' ? 'default' : 'outline'}
              onClick={() => setMode('use_break_only')}
              disabled={submitting}
            >
              {t('stylistWorkbook.reschedule.useBreakOnly')}
            </Button>
          </div>

          {mode === 'manual_minutes' ? (
            <div>
              <Label>{t('stylistWorkbook.reschedule.manualShift')}</Label>
              <Input
                className="mt-2 max-w-[220px]"
                inputMode="numeric"
                value={manualShiftMinutes}
                onChange={(e) => setManualShiftMinutes(e.target.value)}
                disabled={submitting}
              />
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {t('stylistWorkbook.reschedule.includeFutureBreaks')}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
                  ? 'bg-slate-900 border-slate-900 dark:bg-slate-50 dark:border-slate-50'
                  : 'bg-slate-200 border-slate-200 dark:bg-slate-800 dark:border-slate-800',
              )}
              onClick={() => setIncludeBreaks((v) => !v)}
              disabled={submitting}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full bg-white transition-transform',
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
              onClick={() => void fetchProposal()}
              disabled={submitting}
            >
              {t('stylistWorkbook.reschedule.refreshPreview')}
            </Button>
          </div>
        </div>
      </Card>

      {!hasChanges ? (
        <Card className="mt-4 p-5">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {t('stylistWorkbook.reschedule.noChanges')}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {mode === 'use_break_only'
              ? t('stylistWorkbook.reschedule.breakOnlyDescription')
              : t('stylistWorkbook.reschedule.noMovableAppointments')}
          </p>
          {mode === 'use_break_only' ? (
            <Button
              type="button"
              className="mt-4"
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('stylistWorkbook.reschedule.sending')}
                </>
              ) : (
                t('stylistWorkbook.reschedule.applyWithoutMove')
              )}
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((it) => (
            <Card key={it.id} className="p-5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {it.serviceName || t('stylistWorkbook.serviceFallback')} {it.clientName ? `· ${it.clientName}` : ''}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {it.oldStartTime}–{it.oldEndTime} → {it.newStartTime}–{it.newEndTime}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('stylistWorkbook.reschedule.sending')}
              </>
            ) : (
              t('stylistWorkbook.reschedule.notifyClients')
            )}
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stylistWorkbook.reschedule.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('stylistWorkbook.reschedule.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleCommit()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('stylistWorkbook.reschedule.sending')}
                </>
              ) : (
                t('stylistWorkbook.reschedule.notify')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

