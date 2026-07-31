import { useRef, useState } from 'react'
import { Loader2, Paperclip, X } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
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

const inputTypeForField = (fieldType: string): string => {
  if (fieldType === 'NUMBER' || fieldType === 'CURRENCY') return 'number'
  if (fieldType === 'DATE') return 'date'
  return 'text'
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

        {f.templateFields.length > 0 ? (
          <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <legend className="px-1 text-xs font-medium text-slate-500">
              Polja predloška
            </legend>
            {f.templateFields.map((field) => (
              <div key={field.id} className="grid gap-1">
                <Label htmlFor={`field-${field.id}`}>
                  {field.fieldName}
                  {field.isRequired ? (
                    <span className="ml-1 text-rose-500" aria-hidden="true">
                      *
                    </span>
                  ) : null}
                </Label>
                <Input
                  id={`field-${field.id}`}
                  type={inputTypeForField(field.fieldType)}
                  required={field.isRequired}
                  value={f.form.fieldValues[field.id] ?? ''}
                  onChange={(event) => f.setFieldValue(field.id, event.target.value)}
                />
              </div>
            ))}
          </fieldset>
        ) : null}

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

        <div className="grid gap-2">
          <Label htmlFor="expense-files">Prilozi</Label>
          <input
            ref={fileInputRef}
            id="expense-files"
            type="file"
            multiple
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm dark:text-slate-300 dark:file:bg-slate-800"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          {isUploading ? (
            <p className="text-xs text-slate-500">Slanje priloga…</p>
          ) : null}
          {pendingUploads.length > 0 ? (
            <ul className="grid gap-1">
              {pendingUploads.map((upload) => (
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
                    aria-label={`Ukloni prilog ${upload.name}`}
                    onClick={() =>
                      setPendingUploads((prev) =>
                        prev.filter((item) => item.id !== upload.id),
                      )
                    }
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

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
