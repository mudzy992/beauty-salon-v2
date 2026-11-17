import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Switch } from '../../../components/ui/switch'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
import { CategoryFieldsEditor } from './category-fields-editor'
import type { CategoryBundlePayload } from '../hooks/use-expense-catalog'
import type { ExpenseCategory, TemplateFieldPayload } from '../finance.types'

export type CategoryWizardSubmit =
  | { mode: 'create'; payload: CategoryBundlePayload }
  | {
      mode: 'update'
      categoryId: string
      templateId: string
      payload: Omit<CategoryBundlePayload, 'fields'>
    }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ExpenseCategory | null
  isSaving: boolean
  isFieldPending?: boolean
  onSubmit: (submit: CategoryWizardSubmit) => void
  onAddField?: (templateId: string, payload: TemplateFieldPayload) => void
  onRemoveField?: (fieldId: string) => void
}

const empty = (): Omit<CategoryBundlePayload, 'fields'> & {
  draftFields: TemplateFieldPayload[]
} => ({
  name: '',
  description: '',
  isActive: true,
  isFixed: true,
  requiresAttachmentPerItem: false,
  draftFields: [],
})

export function CategoryWizardDialog({
  open,
  onOpenChange,
  editing,
  isSaving,
  isFieldPending = false,
  onSubmit,
  onAddField,
  onRemoveField,
}: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (!open) return
    if (!editing) {
      setForm(empty())
      return
    }
    setForm({
      name: editing.name,
      description: editing.description ?? '',
      isActive: editing.isActive,
      isFixed: editing.isFixed,
      requiresAttachmentPerItem:
        editing.template?.requiresAttachmentPerItem ?? false,
      draftFields: [],
    })
  }, [open, editing])

  const error = !form.name.trim()
    ? t('finance.expenseCategories.validation.nameRequired')
    : !editing && form.draftFields.length === 0
      ? t('finance.expenseCategories.validation.fieldRequired')
      : null

  const handleSave = () => {
    if (error) return
    const base = {
      name: form.name.trim(),
      description: form.description || null,
      isActive: form.isActive,
      isFixed: form.isFixed,
      requiresAttachmentPerItem: form.requiresAttachmentPerItem,
    }
    if (editing) {
      onSubmit({
        mode: 'update',
        categoryId: editing.id,
        templateId: editing.templateId,
        payload: base,
      })
      return
    }
    onSubmit({
      mode: 'create',
      payload: { ...base, fields: form.draftFields },
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        editing
          ? t('finance.expenseCategories.editTitle')
          : t('finance.expenseCategories.createTitle')
      }
      description={t('finance.expenseCategories.wizardDescription')}
      className="max-w-2xl"
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('finance.expenseCategories.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || Boolean(error)}>
            {t('finance.expenseCategories.save')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Label htmlFor="wiz-name">
            {t('finance.expenseCategories.name')}
          </Label>
          <Input
            id="wiz-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="wiz-desc">
            {t('finance.expenseCategories.description')}
          </Label>
          <Textarea
            id="wiz-desc"
            rows={2}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="wiz-fixed">
              {t('finance.expenseCategories.fixedItems')}
            </Label>
            <p className="text-xs text-slate-500">
              {t('finance.expenseCategories.fixedItemsHint')}
            </p>
          </div>
          <Switch
            id="wiz-fixed"
            checked={form.isFixed}
            onCheckedChange={(checked) =>
              setForm({ ...form, isFixed: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="wiz-att">
              {t('finance.expenseCategories.attachmentPerItem')}
            </Label>
            <p className="text-xs text-slate-500">
              {t('finance.expenseCategories.attachmentPerItemHint')}
            </p>
          </div>
          <Switch
            id="wiz-att"
            checked={form.requiresAttachmentPerItem}
            onCheckedChange={(checked) =>
              setForm({ ...form, requiresAttachmentPerItem: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="wiz-active">
            {t('finance.expenseCategories.active')}
          </Label>
          <Switch
            id="wiz-active"
            checked={form.isActive}
            onCheckedChange={(checked) =>
              setForm({ ...form, isActive: checked })
            }
          />
        </div>

        <CategoryFieldsEditor
          template={editing?.template}
          isFixed={form.isFixed}
          isPending={isFieldPending}
          draftFields={form.draftFields}
          onDraftChange={(draftFields) => setForm({ ...form, draftFields })}
          onAddSaved={
            editing && onAddField
              ? (payload) => onAddField(editing.templateId, payload)
              : undefined
          }
          onRemoveSaved={onRemoveField}
        />

        {error ? (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}
