import { Plus, Trash2 } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { createEmptyLineItem, sumLineItems } from './expenses.helpers'
import { findAttachmentForLabel } from './expense-attachment-match'
import { formatMoney, toNumber } from '../finance.utils'
import type { ExpenseAttachment, LineItem } from '../finance.types'
import type { PendingAtt } from './expense-form-state'

type Props = {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  requiresPerItem?: boolean
  lineAttachments?: (PendingAtt | null)[]
  existingAttachments?: ExpenseAttachment[]
  isUploading?: boolean
  onUploadItem?: (index: number, name: string, file: File) => void
  onClearItemAttachment?: (index: number) => void
}

export function LineItemsEditor({
  items,
  onChange,
  requiresPerItem = false,
  lineAttachments = [],
  existingAttachments = [],
  isUploading = false,
  onUploadItem,
  onClearItemAttachment,
}: Props) {
  const update = (index: number, patch: Partial<LineItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>Stavke</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, createEmptyLineItem()])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Dodaj stavku
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">Bez stavki – unesite ukupan iznos ručno.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, index) => {
            const pending = lineAttachments[index]
            const existing = findAttachmentForLabel(existingAttachments, item.name)
            return (
              <li
                key={index}
                className="grid gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800"
              >
                <div className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-12 grid gap-1 sm:col-span-5">
                    <Label htmlFor={`item-name-${index}`} className="text-xs">
                      Naziv
                    </Label>
                    <Input
                      id={`item-name-${index}`}
                      value={item.name}
                      onChange={(e) => update(index, { name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4 grid gap-1 sm:col-span-2">
                    <Label htmlFor={`item-qty-${index}`} className="text-xs">
                      Kol.
                    </Label>
                    <Input
                      id={`item-qty-${index}`}
                      type="number"
                      min={0}
                      value={item.qty}
                      onChange={(e) => update(index, { qty: toNumber(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-6 grid gap-1 sm:col-span-3">
                    <Label htmlFor={`item-price-${index}`} className="text-xs">
                      Cijena
                    </Label>
                    <Input
                      id={`item-price-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.price}
                      onChange={(e) => update(index, { price: toNumber(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ukloni stavku ${index + 1}`}
                      onClick={() => onChange(items.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                {requiresPerItem ? (
                  <div className="flex flex-wrap items-center gap-2 pl-0.5">
                    <span className="text-xs text-slate-500">Prilog:</span>
                    {pending ? (
                      <>
                        <Badge variant="secondary">{pending.name}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onClearItemAttachment?.(index)}
                        >
                          Ukloni
                        </Button>
                      </>
                    ) : existing ? (
                      <Badge variant="outline">
                        {existing.upload?.originalName ?? 'postojeći'}
                      </Badge>
                    ) : (
                      <input
                        type="file"
                        className="max-w-full text-xs"
                        disabled={isUploading || !item.name.trim()}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onUploadItem?.(index, item.name, file)
                          e.target.value = ''
                        }}
                      />
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {items.length > 0 ? (
        <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
          <span className="text-slate-500">Zbir stavki</span>
          <span className="font-semibold tabular-nums">
            {formatMoney(sumLineItems(items))}
          </span>
        </div>
      ) : null}
    </div>
  )
}
