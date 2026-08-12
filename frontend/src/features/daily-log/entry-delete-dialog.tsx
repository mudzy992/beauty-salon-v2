import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type { DailyLogEntry } from './types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyLogEntry | null
  reason: string
  onReasonChange: (value: string) => void
  saving: boolean
  onConfirm: () => void
}

export const DailyLogDeleteDialog = ({
  open,
  onOpenChange,
  entry,
  reason,
  onReasonChange,
  saving,
  onConfirm,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Obriši unos</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Brisanje će ukloniti unos iz statistika
        {entry?.status === 'COMPLETED'
          ? ' i poništiti knjiženje u KIF-u (ako mjesec nije zaključan)'
          : ''}
        .
        {entry?.status === 'COMPLETED' && entry.reservation
          ? ' Ako je unos vezan za rezervaciju, termin se vraća u status „U toku“ (IN_PROGRESS) — stilist ga ponovo vidi kao aktivan.'
          : ''}
      </p>
      <div>
        <Label>Razlog brisanja (obavezno)</Label>
        <Textarea
          className="mt-1"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          placeholder="Npr. greška pri unosu..."
        />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Odustani
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
          disabled={saving || !reason.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Brišem...
            </>
          ) : (
            'Obriši'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
