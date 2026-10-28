import { Check, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import type { DailyLogEntry } from './types'

type Props = {
  entry: DailyLogEntry
  onView: (entry: DailyLogEntry) => void
  onEdit: (entry: DailyLogEntry) => void
  onComplete: (id: string) => void
  onDelete: (entry: DailyLogEntry) => void
  onRestore: (entry: DailyLogEntry) => void
}

export const DailyLogEntryActions = ({
  entry,
  onView,
  onEdit,
  onComplete,
  onDelete,
  onRestore,
}: Props) => {
  const { t } = useTranslation()
  if (entry.deletedAt) {
    return (
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label={t('dailyLog.table.actions.view')}
          onClick={() => onView(entry)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label={t('dailyLog.table.actions.restore')}
          onClick={() => onRestore(entry)}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    )
  }
  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={t('dailyLog.table.actions.view')}
        onClick={() => onView(entry)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={t('dailyLog.table.actions.edit')}
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
          aria-label={t('dailyLog.table.actions.complete')}
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
        aria-label={t('dailyLog.table.actions.delete')}
        onClick={() => onDelete(entry)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
