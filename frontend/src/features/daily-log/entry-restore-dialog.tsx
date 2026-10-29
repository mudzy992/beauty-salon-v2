import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarIcon, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import type { DailyLogEntry } from './types'
import {
  formatDateOnlyLocale,
  getSalonDateOnly,
} from '../../../../shared/business-date.mjs'

type Props = {
  entry: DailyLogEntry | null
  onClose: () => void
  onConfirm: (id: string, date?: string) => void
  loading?: boolean
}

const isFutureDate = (dateStr: string): boolean =>
  dateStr.slice(0, 10) > getSalonDateOnly()

const formatDate = (dateStr: string, language: string) => {
  try {
    return formatDateOnlyLocale(dateStr.slice(0, 10), getIntlLocale(language), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export const EntryRestoreDialog = ({ entry, onClose, onConfirm, loading }: Props) => {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState<'original' | 'new'>('original')
  const [newDate, setNewDate] = useState('')

  if (!entry) return null

  const originalDate = entry.date?.slice(0, 10) ?? ''
  const hasReservation = !!entry.reservation && !entry.isManual
  const activeDate = mode === 'original' ? originalDate : newDate
  const willCreateReservation = hasReservation && !!activeDate && isFutureDate(activeDate)

  const handleConfirm = () => {
    if (mode === 'original') {
      onConfirm(entry.id)
    } else {
      if (!newDate) return
      onConfirm(entry.id, newDate)
    }
  }

  const isValid = mode === 'original' || (mode === 'new' && !!newDate)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dailyLog.restoreDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
              <input
                type="radio"
                name="restore-mode"
                value="original"
                checked={mode === 'original'}
                onChange={() => { setMode('original'); setNewDate('') }}
                className="accent-primary"
              />
              <span className="text-sm">
                {t('dailyLog.restoreDialog.originalDate')}{' '}
                <span className="font-semibold">{formatDate(originalDate, i18n.language)}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
              <input
                type="radio"
                name="restore-mode"
                value="new"
                checked={mode === 'new'}
                onChange={() => setMode('new')}
                className="accent-primary"
              />
              <span className="text-sm">{t('dailyLog.restoreDialog.newDateOption')}</span>
            </label>
          </div>

          {mode === 'new' && (
            <div className="space-y-1">
              <Label htmlFor="new-date" className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                {t('dailyLog.restoreDialog.newDate')}
              </Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          )}

          {hasReservation && (
            <div className={`flex gap-2 rounded-lg border p-3 text-sm ${
              willCreateReservation
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                {willCreateReservation ? (
                  <p>{t('dailyLog.restoreDialog.futureReservation')}</p>
                ) : (
                  <p>{t('dailyLog.restoreDialog.restoredPending')}</p>
                )}
                <p className="text-xs opacity-80">
                  {entry.reservation?.acceptanceMode === 'DIRECT_ASSIGN'
                    ? t('dailyLog.restoreDialog.directAssignPolicy')
                    : t('dailyLog.restoreDialog.standardPolicy')}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? t('dailyLog.restoreDialog.restoring') : t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
