import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import type { DailyLogEntry } from './types'

type Props = {
  entry: DailyLogEntry
  onEdit: (entry: DailyLogEntry) => void
  onComplete: (id: string) => void
  onDelete: (entry: DailyLogEntry) => void
  onRestore: (id: string) => void
}

export const DailyLogEntryActions = ({
  entry,
  onEdit,
  onComplete,
  onDelete,
  onRestore,
}: Props) => {
  if (entry.deletedAt) {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Vrati"
        onClick={() => onRestore(entry.id)}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    )
  }
  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Uredi"
        onClick={() => onEdit(entry)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {entry.status !== 'COMPLETED' ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-emerald-600"
          aria-label="Kompletiraj"
          onClick={() => onComplete(entry.id)}
        >
          <Check className="h-4 w-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-rose-600"
        aria-label="Obriši"
        onClick={() => onDelete(entry)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
