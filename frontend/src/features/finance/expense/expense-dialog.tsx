import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
import { ExpenseAttachmentFields } from './expense-attachment-fields'
import { ExpenseTemplateFields } from './expense-template-fields'
import { LineItemsEditor } from './line-items-editor'
import { useExpenseForm } from './use-expense-form'
import { uploadExpenseFile } from '../api/expense-books.api'
import { formatMoney } from '../finance.utils'
import { useAppToast } from '../../../lib/toast/useAppToast'
import type { Expense, ExpenseCategory, ExpensePayload } from '../finance.types'

type ExpenseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookId: string
  editing: Expense | null
  categories: ExpenseCategory[]
  isSaving: boolean
  onSubmit: (payload: ExpensePayload) => void
}

export function ExpenseDialog({
  open,
  onOpenChange,
  bookId,
  editing,
  categories,
  isSaving,
  onSubmit,
}: ExpenseDialogProps) {
  const { toastApiError } = useAppToast()
  const f = useExpenseForm({ open, bookId, editing, categories })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingUploads, setPendingUploads] = useState<
    { id: string; name: string }[]
  >([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setIsUploading(true)
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => ({
          id: await uploadExpenseFile(file),
          name: file.name,
        })),
      )
      setPendingUploads((prev) => [...prev, ...uploaded])
    } catch (err) {
      toastApiError(err, 'Slanje priloga nije uspjelo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) setPendingUploads([])
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={editing ? 'Uredi rashod' : 'Novi rashod'}
      description="Obavezna polja predloška kategorije moraju biti popunjena."
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Odustani
          </Button>
          <Button
            onClick={() => onSubmit(f.toPayload(pendingUploads.map((u) => u.id)))}
            disabled={isSaving || isUploading || Boolean(f.validationError)}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            Sačuvaj
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Label htmlFor="expense-cat">Kategorija</Label>
          <select
            id="expense-cat"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            value={f.form.categoryId}
            onChange={(event) => f.update({ categoryId: event.target.value })}
            disabled={Boolean(editing)}
          >
            <option value="">— Odaberi kategoriju —</option>
            {categories
              .filter((category) => category.isActive || category.id === f.form.categoryId)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="expense-title">Naziv</Label>
          <Input
            id="expense-title"
            value={f.form.title}
            onChange={(event) => f.update({ title: event.target.value })}
          />
        </div>

        <ExpenseTemplateFields
          fields={f.templateFields}
          values={f.form.fieldValues}
          onChange={f.setFieldValue}
        />

        <LineItemsEditor
          items={f.form.lineItems}
          onChange={(lineItems) => f.update({ lineItems })}
        />

        <div className="grid gap-1">
          <Label htmlFor="expense-total">Ukupan iznos</Label>
          <Input
            id="expense-total"
            type="number"
            min={0}
            step="0.01"
            value={
              f.form.lineItems.length > 0
                ? f.lineItemsTotal.toFixed(2)
                : f.form.totalAmount
            }
            onChange={(event) => f.update({ totalAmount: event.target.value })}
            disabled={f.form.lineItems.length > 0}
          />
          {f.form.lineItems.length > 0 ? (
            <p className="text-xs text-slate-500">
              Iznos se računa iz stavki: {formatMoney(f.lineItemsTotal)}
            </p>
          ) : null}
        </div>

        <ExpenseAttachmentFields
          existing={editing?.attachments ?? []}
          pending={pendingUploads}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          onFiles={(files) => void handleFiles(files)}
          onRemovePending={(id) =>
            setPendingUploads((prev) => prev.filter((item) => item.id !== id))
          }
        />

        <div className="grid gap-1">
          <Label htmlFor="expense-notes">Napomena</Label>
          <Textarea
            id="expense-notes"
            rows={2}
            value={f.form.notes}
            onChange={(event) => f.update({ notes: event.target.value })}
          />
        </div>

        {f.validationError ? (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {f.validationError}
          </p>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}
