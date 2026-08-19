import { useState } from 'react'
import { format } from 'date-fns'
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
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Input } from '../../components/ui/input'
import type { DailyLogEntry } from './types'

type Props = {
  entry: DailyLogEntry | null
  onClose: () => void
  onConfirm: (id: string, date?: string) => void
  loading?: boolean
}

const isFutureDate = (dateStr: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) > today
}

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'dd.MM.yyyy')
  } catch {
    return dateStr
  }
}

export const EntryRestoreDialog = ({ entry, onClose, onConfirm, loading }: Props) => {
  const [mode, setMode] = useState<'original' | 'new'>('original')
  const [newDate, setNewDate] = useState('')

  if (!entry) return null

  const originalDate = entry.date?.slice(0, 10) ?? ''
  const hasReservation = !!entry.reservation && !entry.isManual
  const willBeReservation = hasReservation && mode === 'new' && newDate && isFutureDate(newDate)

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
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as 'original' | 'new')}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value="original" id="r-original" />
              <Label htmlFor="r-original" className="cursor-pointer">
                Vrati na originalni datum{' '}
                <span className="font-semibold">{formatDate(originalDate)}</span>
              </Label>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value="new" id="r-new" />
              <Label htmlFor="r-new" className="cursor-pointer">Definiši novi datum</Label>
            </div>
          </RadioGroup>

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

          {willBeReservation && (
            <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Datum je u budućnosti — zapis će biti vraćen kao{' '}
                <strong>nova rezervacija</strong> s istim terminima i stilistom.
                Policy (direktna dodjela / inbox) nasljeđuje se iz originalne rezervacije.
              </p>
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
