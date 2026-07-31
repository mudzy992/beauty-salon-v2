import { useEffect, useState } from 'react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Switch } from '../../../components/ui/switch'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
import type { ExpenseTemplate } from '../finance.types'

export type TemplateFormPayload = {
  name: string
  description?: string | null
  requiresAttachmentPerItem: boolean
}

type TemplateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ExpenseTemplate | null
  isSaving: boolean
  onSubmit: (payload: TemplateFormPayload) => void
}

const emptyForm = (): TemplateFormPayload => ({
  name: '',
  description: '',
  requiresAttachmentPerItem: false,
})

export function TemplateDialog({
  open,
  onOpenChange,
  editing,
  isSaving,
  onSubmit,
}: TemplateDialogProps) {
  const [form, setForm] = useState<TemplateFormPayload>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            name: editing.name,
            description: editing.description ?? '',
            requiresAttachmentPerItem: editing.requiresAttachmentPerItem,
          }
        : emptyForm(),
    )
  }, [open, editing])

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Uredi predložak' : 'Novi predložak'}
      className="max-w-lg"
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Odustani
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isSaving || !form.name.trim()}
          >
            Sačuvaj
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Label htmlFor="tpl-name">Naziv</Label>
          <Input
            id="tpl-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="tpl-desc">Opis</Label>
          <Textarea
            id="tpl-desc"
            rows={2}
            value={form.description ?? ''}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="tpl-attachment">Prilog po stavci</Label>
            <p className="text-xs text-slate-500">
              Uključeno: prilog uz svaku fiksnu stavku / liniju (npr. doprinosi).
              Isključeno: prilog na cijeli rashod (npr. faktura materijala).
            </p>
          </div>
          <Switch
            id="tpl-attachment"
            checked={form.requiresAttachmentPerItem}
            onCheckedChange={(checked) =>
              setForm({ ...form, requiresAttachmentPerItem: checked })
            }
          />
        </div>
      </div>
    </ResponsiveDialog>
  )
}
