import { Plus, Trash2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { createEmptyLineItem, sumLineItems } from './expenses.helpers'
import { formatMoney, toNumber } from '../finance.utils'
import type { LineItem } from '../finance.types'

type LineItemsEditorProps = {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}

/** Stavke fakture; njihov zbir postaje ukupan iznos rashoda. */
export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
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
        <p className="text-xs text-slate-500">
          Bez stavki – unesite ukupan iznos ručno.
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, index) => (
            <li key={index} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-12 grid gap-1 sm:col-span-6">
                <Label htmlFor={`item-name-${index}`} className="text-xs">
                  Naziv
                </Label>
                <Input
                  id={`item-name-${index}`}
                  value={item.name}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
              </div>
              <div className="col-span-4 grid gap-1 sm:col-span-2">
                <Label htmlFor={`item-qty-${index}`} className="text-xs">
                  Količina
                </Label>
                <Input
                  id={`item-qty-${index}`}
                  type="number"
                  min={0}
                  value={item.qty}
                  onChange={(event) =>
                    update(index, { qty: toNumber(event.target.value) })
                  }
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
                  onChange={(event) =>
                    update(index, { price: toNumber(event.target.value) })
                  }
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ukloni stavku ${index + 1}`}
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
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
