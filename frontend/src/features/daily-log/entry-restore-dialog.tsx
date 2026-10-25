import { useState } from 'react'
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

const formatDate = (dateStr: string) => {
  try {
    return formatDateOnlyLocale(dateStr.slice(0, 10), 'bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const getPolicyLabel = (acceptanceMode?: string | null): string => {
  if (acceptanceMode === 'DIRECT_ASSIGN') {
    return 'Direktna rezervacija — automatski potvrđena, bez čekanja klijenta.'
  }
  return 'Standardna rezervacija — klijent treba potvrditi termin.'
}

export const EntryRestoreDialog = ({ entry, onClose, onConfirm, loading }: Props) => {
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
          <DialogTitle>Vraćanje zapisa</DialogTitle>
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
                Vrati na originalni datum{' '}
                <span className="font-semibold">{formatDate(originalDate)}</span>
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
              <span className="text-sm">Definiši novi datum</span>
            </label>
          </div>

          {mode === 'new' && (
            <div className="space-y-1">
              <Label htmlFor="new-date" className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                Novi datum
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
                  <p>
                    Datum je u budućnosti — kreiraće se{' '}
                    <strong>nova rezervacija</strong> s istim terminima i stilistom.
                  </p>
                ) : (
                  <p>Zapis će biti vraćen u dnevnu knjigu kao PENDING na odabrani datum.</p>
                )}
                <p className="text-xs opacity-80">
                  {getPolicyLabel(entry.reservation?.acceptanceMode)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Odustani
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? 'Vraćanje...' : 'Potvrdi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
