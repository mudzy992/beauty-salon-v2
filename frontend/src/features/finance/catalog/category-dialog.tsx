import { useEffect, useState } from 'react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Switch } from '../../../components/ui/switch'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
import type { ExpenseCategory, ExpenseTemplate } from '../finance.types'

export type CategoryFormPayload = {
  name: string
  description?: string | null
  templateId: string
  isActive: boolean
  isFixed: boolean
}

type CategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ExpenseCategory | null
  templates: ExpenseTemplate[]
  isSaving: boolean
  onSubmit: (payload: CategoryFormPayload) => void
}

const emptyForm = (): CategoryFormPayload => ({
  name: '',
  description: '',
  templateId: '',
  isActive: true,
  isFixed: false,
})

export function CategoryDialog({
  open,
  onOpenChange,
  editing,
  templates,
  isSaving,
  onSubmit,
}: CategoryDialogProps) {
  const [form, setForm] = useState<CategoryFormPayload>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            name: editing.name,
            description: editing.description ?? '',
            templateId: editing.templateId,
            isActive: editing.isActive,
            isFixed: editing.isFixed,
          }
        : emptyForm(),
    )
  }, [open, editing])

  const error = !form.name.trim()
    ? 'Naziv je obavezan.'
    : !form.templateId
      ? 'Odaberite predložak.'
      : null

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Uredi kategoriju' : 'Nova kategorija'}
      description="Predložak određuje koja polja su obavezna pri unosu rashoda."
      className="max-w-lg"
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Odustani
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={isSaving || Boolean(error)}>
            Sačuvaj
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Label htmlFor="cat-name">Naziv</Label>
          <Input
            id="cat-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cat-template">Predložak</Label>
          <select
            id="cat-template"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            value={form.templateId}
            onChange={(event) => setForm({ ...form, templateId: event.target.value })}
          >
            <option value="">— Odaberi predložak —</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.fields?.length ?? 0} polja)
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cat-desc">Opis</Label>
          <Textarea
            id="cat-desc"
            rows={2}
            value={form.description ?? ''}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="cat-active">Aktivna</Label>
          <Switch
            id="cat-active"
            checked={form.isActive}
            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="cat-fixed">Fiksni trošak</Label>
            <p className="text-xs text-slate-500">Ponavlja se svakog mjeseca.</p>
          </div>
          <Switch
            id="cat-fixed"
            checked={form.isFixed}
            onCheckedChange={(checked) => setForm({ ...form, isFixed: checked })}
          />
        </div>
        {error ? (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}
