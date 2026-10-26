import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
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
import { disposeDailyLogEntry } from '../api/stylist-workbook.api'
import type { DailyLogEntry } from '../types'
import {
  DISPOSITION_ACTION_HINT_KEYS,
  DISPOSITION_ACTION_KEYS,
  DISPOSITION_ACTION_LABEL_KEYS,
  DISPOSITION_PANEL_HINT_KEY,
  DISPOSITION_PANEL_TITLE_KEY,
  type DispositionAction,
} from './disposition-copy'

type Props = {
  entry: DailyLogEntry
  onDone: () => void
}

export const DailyLogDispositionPanel = ({ entry, onDone }: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<DispositionAction | null>(null)
  const [reason, setReason] = useState('')
  const [targetDate, setTargetDate] = useState(
    String(entry.reservation?.reservationDate ?? entry.date ?? '').slice(0, 10),
  )
  const [targetStartTime, setTargetStartTime] = useState(
    entry.reservation?.startTime?.slice(0, 5) ?? '',
  )
  const [targetEndTime, setTargetEndTime] = useState(
    entry.reservation?.endTime?.slice(0, 5) ?? '',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showPanel =
    entry.status === 'PENDING' &&
    entry.reservation?.status === 'AWAITING_DAILY_LOG'

  if (!showPanel) return null

  const openAction = (next: DispositionAction) => {
    setAction(next)
    setReason('')
    setError(null)
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!action) return
    const trimmed = reason.trim()
    if (!trimmed) {
      setError(t('stylistWorkbook.disposition.reasonRequired'))
      return
    }
    if (action === 'reorder') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) {
        setError(t('stylistWorkbook.disposition.invalidDate'))
        return
      }
      if (!/^\d{2}:\d{2}$/.test(targetStartTime.trim()) || !/^\d{2}:\d{2}$/.test(targetEndTime.trim())) {
        setError(t('stylistWorkbook.disposition.invalidTime'))
        return
      }
    }
    setSubmitting(true)
    setError(null)
    try {
      await disposeDailyLogEntry({
        entryId: entry.id,
        action,
        reason: trimmed,
        targetDate: action === 'reorder' ? targetDate.trim() : undefined,
        targetStartTime: action === 'reorder' ? targetStartTime.trim() : undefined,
        targetEndTime: action === 'reorder' ? targetEndTime.trim() : undefined,
        applyPenalty: action === 'no_show' || action === 'cancel_as_client',
      })
      setOpen(false)
      onDone()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('stylistWorkbook.disposition.genericError')
      setError(
        Array.isArray(msg)
          ? msg[0]
          : String(msg ?? t('stylistWorkbook.disposition.genericError')),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">
          {t(DISPOSITION_PANEL_TITLE_KEY)}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t(DISPOSITION_PANEL_HINT_KEY)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DISPOSITION_ACTION_KEYS.map((key) => (
          <Button key={key} type="button" variant="outline" size="sm" onClick={() => openAction(key)}>
            {t(DISPOSITION_ACTION_LABEL_KEYS[key])}
          </Button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action
                ? t(DISPOSITION_ACTION_LABEL_KEYS[action])
                : t('stylistWorkbook.disposition.actionFallback')}
            </DialogTitle>
            <DialogDescription>
              {action
                ? t(DISPOSITION_ACTION_HINT_KEYS[action])
                : t('stylistWorkbook.disposition.actionFallbackHint')}{' '}
              {t('stylistWorkbook.disposition.enterReason')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {action === 'reorder' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="targetDate">{t('stylistWorkbook.disposition.newDate')}</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="targetStart">{t('stylistWorkbook.disposition.newStart')}</Label>
                  <Input
                    id="targetStart"
                    value={targetStartTime}
                    onChange={(e) => setTargetStartTime(e.target.value)}
                    placeholder="09:00"
                  />
                </div>
                <div>
                  <Label htmlFor="targetEnd">{t('stylistWorkbook.disposition.newEnd')}</Label>
                  <Input
                    id="targetEnd"
                    value={targetEndTime}
                    onChange={(e) => setTargetEndTime(e.target.value)}
                    placeholder="10:00"
                  />
                </div>
              </div>
            ) : null}
            <div>
              <Label htmlFor="dispositionReason">{t('stylistWorkbook.disposition.reason')}</Label>
              <Input
                id="dispositionReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('stylistWorkbook.disposition.reasonPlaceholder')}
              />
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting
                ? t('stylistWorkbook.disposition.submitting')
                : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
