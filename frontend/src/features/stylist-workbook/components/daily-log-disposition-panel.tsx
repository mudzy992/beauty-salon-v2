import { useState } from 'react'

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
  DISPOSITION_ACTION_HINTS,
  DISPOSITION_ACTION_KEYS,
  DISPOSITION_ACTION_LABELS,
  DISPOSITION_PANEL_HINT,
  DISPOSITION_PANEL_TITLE,
  type DispositionAction,
} from './disposition-copy'

type Props = {
  entry: DailyLogEntry
  onDone: () => void
}

export const DailyLogDispositionPanel = ({ entry, onDone }: Props) => {
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
      setError('Razlog je obavezan.')
      return
    }
    if (action === 'reorder') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) {
        setError('Unesite datum (YYYY-MM-DD).')
        return
      }
      if (!/^\d{2}:\d{2}$/.test(targetStartTime.trim()) || !/^\d{2}:\d{2}$/.test(targetEndTime.trim())) {
        setError('Unesite vrijeme u formatu HH:mm.')
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
          : 'Greška.'
      setError(Array.isArray(msg) ? msg[0] : String(msg ?? 'Greška'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">{DISPOSITION_PANEL_TITLE}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{DISPOSITION_PANEL_HINT}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DISPOSITION_ACTION_KEYS.map((key) => (
          <Button key={key} type="button" variant="outline" size="sm" onClick={() => openAction(key)}>
            {DISPOSITION_ACTION_LABELS[key]}
          </Button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action ? DISPOSITION_ACTION_LABELS[action] : 'Akcija'}</DialogTitle>
            <DialogDescription>
              {action ? DISPOSITION_ACTION_HINTS[action] : 'Akcija je nepovratna.'} Unesite razlog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {action === 'reorder' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="targetDate">Novi datum</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="targetStart">Novi početak</Label>
                  <Input
                    id="targetStart"
                    value={targetStartTime}
                    onChange={(e) => setTargetStartTime(e.target.value)}
                    placeholder="09:00"
                  />
                </div>
                <div>
                  <Label htmlFor="targetEnd">Novi kraj</Label>
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
              <Label htmlFor="dispositionReason">Razlog</Label>
              <Input
                id="dispositionReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Obrazloženje"
              />
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Odustani
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? 'Spremam…' : 'Potvrdi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
