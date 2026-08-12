import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import {
  durationMinutesFromRange,
  endTimeFromStartAndDuration,
  normalizeHm,
  parseHmToMinutes,
} from '../utils/reservation-time'

type ReorderReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  currentStartTime: string
  currentEndTime: string
  onConfirm: (args: { startTime: string; endTime: string }) => void | Promise<void>
}

export const ReorderReservationDialog = ({
  open,
  onOpenChange,
  pending,
  currentStartTime,
  currentEndTime,
  onConfirm,
}: ReorderReservationDialogProps) => {
  const durationMinutes = useMemo(
    () => durationMinutesFromRange(currentStartTime, currentEndTime),
    [currentStartTime, currentEndTime],
  )
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    if (!open) return
    const start = normalizeHm(currentStartTime) || '09:00'
    setStartTime(start)
    setEndTime(endTimeFromStartAndDuration(start, durationMinutes) || normalizeHm(currentEndTime))
  }, [open, currentStartTime, currentEndTime, durationMinutes])

  const handleStartChange = (raw: string) => {
    const next = normalizeHm(raw) || raw
    setStartTime(next)
    const computed = endTimeFromStartAndDuration(next, durationMinutes)
    if (computed) setEndTime(computed)
  }

  const handleEndChange = (raw: string) => {
    setEndTime(normalizeHm(raw) || raw)
  }

  const startOk = parseHmToMinutes(startTime) != null
  const endOk = parseHmToMinutes(endTime) != null
  const rangeOk =
    startOk &&
    endOk &&
    (parseHmToMinutes(endTime) as number) > (parseHmToMinutes(startTime) as number)
  const previewLabel = rangeOk
    ? `${normalizeHm(startTime)} – ${normalizeHm(endTime)} (${durationMinutesFromRange(startTime, endTime)} min)`
    : 'Odaberite valjano vrijeme'

  const handleConfirm = async () => {
    if (!rangeOk) return
    await onConfirm({
      startTime: normalizeHm(startTime),
      endTime: normalizeHm(endTime),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reorder termina</DialogTitle>
          <DialogDescription>
            Pošaljite prijedlog novog termina klijentu. Trajanje se zadržava ({durationMinutes} min) kad
            mijenjate početak.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reorderStart">Novi početak</Label>
            <Input
              id="reorderStart"
              type="time"
              value={normalizeHm(startTime) || startTime}
              onChange={(e) => handleStartChange(e.target.value)}
              aria-label="Novi početak termina"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reorderEnd">Novi kraj</Label>
            <Input
              id="reorderEnd"
              type="time"
              value={normalizeHm(endTime) || endTime}
              onChange={(e) => handleEndChange(e.target.value)}
              aria-label="Novi kraj termina"
            />
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          Pregled: {previewLabel}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Odustani
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={pending || !rangeOk}>
            Pošalji klijentu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
