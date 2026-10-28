import type { ChangeEvent, Ref } from 'react'
import { Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import { ExpenseAttachmentsList } from './expense-attachments'
import type { ExpenseAttachment } from '../finance.types'

type PendingUpload = { id: string; name: string }

type Props = {
  existing: ExpenseAttachment[]
  pending: PendingUpload[]
  isUploading: boolean
  fileInputRef: Ref<HTMLInputElement>
  onFiles: (files: FileList | null) => void
  onRemovePending: (id: string) => void
}

export function ExpenseAttachmentFields({
  existing,
  pending,
  isUploading,
  fileInputRef,
  onFiles,
  onRemovePending,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-2">
      <Label htmlFor="expense-files">{t('finance.expenseForm.attachments')}</Label>
      {existing.length > 0 ? (
        <div className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
          <p className="mb-1 text-xs font-medium text-slate-500">
            {t('finance.expenseForm.existingAttachments')}
          </p>
          <ExpenseAttachmentsList attachments={existing} />
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        id="expense-files"
        type="file"
        multiple
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm dark:text-slate-300 dark:file:bg-slate-800"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onFiles(event.target.files)
        }
      />
      {isUploading ? (
        <p className="text-xs text-slate-500">{t('finance.expenseForm.uploadingAttachments')}</p>
      ) : null}
      {pending.length > 0 ? (
        <ul className="grid gap-1">
          {pending.map((upload) => (
            <li
              key={upload.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-800"
            >
              <span className="inline-flex items-center gap-1 truncate">
                <Paperclip className="h-3 w-3" aria-hidden="true" />
                {upload.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('finance.expenseForm.removeAttachment', { name: upload.name })}
                onClick={() => onRemovePending(upload.id)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
