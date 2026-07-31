import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
import { ExpenseAttachmentFields } from './expense-attachment-fields'
import { FixedFieldsEditor } from './fixed-fields-editor'
import { LineItemsEditor } from './line-items-editor'
import { useExpenseForm } from './use-expense-form'
import { useExpenseUploads } from './use-expense-uploads'
import { formatMoney } from '../finance.utils'
import { useAppToast } from '../../../lib/toast/useAppToast'
import type { Expense, ExpenseCategory, ExpensePayload } from '../finance.types'

type Props = {
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
}: Props) {
  const { toastApiError } = useAppToast()
  const f = useExpenseForm({ open, bookId, editing, categories })
  const uploads = useExpenseUploads({
    fieldAttachments: f.form.fieldAttachments,
    lineAttachments: f.form.lineAttachments,
    lineItemsLength: f.form.lineItems.length,
    onFieldAttachments: (fieldAttachments) => f.update({ fieldAttachments }),
    onLineAttachments: (lineAttachments) => f.update({ lineAttachments }),
    onError: toastApiError,
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) uploads.resetPending()
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={editing ? 'Uredi rashod' : 'Novi rashod'}
      description={
        f.isFixed
          ? 'Fiksne stavke iz predloška – vrijednosti i prilozi po stavci.'
          : 'Unesite stavke fakture; prilog može biti na cijeli rashod ili po stavci.'
      }
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Odustani
          </Button>
          <Button
            onClick={() => onSubmit(f.toPayload(uploads.pendingUploads.map((u) => u.id)))}
            disabled={isSaving || uploads.isUploading || Boolean(f.validationError)}
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
            onChange={(e) => f.selectCategory(e.target.value)}
            disabled={Boolean(editing)}
          >
            <option value="">— Odaberi kategoriju —</option>
            {categories
              .filter((c) => c.isActive || c.id === f.form.categoryId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isFixed ? ' (fiksno)' : ''}
                </option>
              ))}
          </select>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="expense-title">Naziv</Label>
          <Input
            id="expense-title"
            value={f.form.title}
            onChange={(e) => f.update({ title: e.target.value })}
          />
        </div>

        {f.category && f.isFixed ? (
          <FixedFieldsEditor
            fields={f.templateFields}
            values={f.form.fieldValues}
            attachments={f.form.fieldAttachments}
            existingAttachments={editing?.attachments ?? []}
            requiresPerItem={f.requiresPerItem}
            isUploading={uploads.isUploading}
            onValueChange={f.setFieldValue}
            onUpload={(id, name, file) => void uploads.handleFieldUpload(id, name, file)}
            onClearPending={(id) => {
              const next = { ...f.form.fieldAttachments }
              delete next[id]
              f.update({ fieldAttachments: next })
            }}
          />
        ) : null}

        {f.category && !f.isFixed ? (
          <>
            <LineItemsEditor
              items={f.form.lineItems}
              onChange={f.setLineItems}
              requiresPerItem={f.requiresPerItem}
              lineAttachments={f.form.lineAttachments}
              existingAttachments={editing?.attachments ?? []}
              isUploading={uploads.isUploading}
              onUploadItem={(i, name, file) => void uploads.handleLineUpload(i, name, file)}
              onClearItemAttachment={(i) => {
                const next = [...f.form.lineAttachments]
                next[i] = null
                f.update({ lineAttachments: next })
              }}
            />
            {f.form.lineItems.length === 0 ? (
              <div className="grid gap-1">
                <Label htmlFor="expense-total">Ukupan iznos</Label>
                <Input
                  id="expense-total"
                  type="number"
                  min={0}
                  step="0.01"
                  value={f.form.totalAmount}
                  onChange={(e) => f.update({ totalAmount: e.target.value })}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-500">Iznos: {formatMoney(f.effectiveTotal)}</p>
            )}
            <ExpenseAttachmentFields
              existing={editing?.attachments ?? []}
              pending={uploads.pendingUploads}
              isUploading={uploads.isUploading}
              fileInputRef={uploads.fileInputRef}
              onFiles={(files) => void uploads.handleBulkFiles(files)}
              onRemovePending={(id) =>
                uploads.setPendingUploads((prev) => prev.filter((item) => item.id !== id))
              }
            />
          </>
        ) : null}

        <div className="grid gap-1">
          <Label htmlFor="expense-notes">Napomena</Label>
          <Textarea
            id="expense-notes"
            rows={2}
            value={f.form.notes}
            onChange={(e) => f.update({ notes: e.target.value })}
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
