import { Button } from '../../../components/ui/button'
import { ResponsiveDialog } from '../components/responsive-dialog'
import { ExpenseAttachmentsList } from './expense-attachments'
import { parseExpenseNotes } from './expense-notes'
import { sumLineItems } from './expenses.helpers'
import { formatIsoDateBs, formatMoney, toNumber } from '../finance.utils'
import type { Expense, LineItem } from '../finance.types'

type Props = {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewRow = { name: string; qty: number; price: number; total: number }

const rowsFromExpense = (expense: Expense): PreviewRow[] => {
  if (expense.category?.isFixed) {
    return (expense.fieldValues ?? []).map((fv) => {
      const price = toNumber(fv.value)
      return {
        name: fv.field?.fieldName ?? 'Polje',
        qty: 1,
        price,
        total: price,
      }
    })
  }
  const items: LineItem[] = parseExpenseNotes(expense.notes).lineItems
  return items.map((item) => ({
    name: item.name,
    qty: toNumber(item.qty) || 1,
    price: toNumber(item.price),
    total: (toNumber(item.qty) || 1) * toNumber(item.price),
  }))
}

export function ExpenseInvoicePreview({ expense, open, onOpenChange }: Props) {
  if (!expense) return null

  const rows = rowsFromExpense(expense)
  const notes = expense.category?.isFixed
    ? expense.notes ?? ''
    : parseExpenseNotes(expense.notes).userNotes
  const computedTotal = expense.category?.isFixed
    ? rows.reduce((sum, row) => sum + row.total, 0)
    : sumLineItems(
        rows.map((row) => ({ name: row.name, qty: row.qty, price: row.price })),
      )
  const displayTotal =
    rows.length > 0 ? computedTotal : toNumber(expense.totalAmount)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Pregled: ${expense.title}`}
      description={`${formatIsoDateBs(expense.createdAt)} · ${expense.category?.name ?? 'Rashod'}`}
      className="max-w-2xl"
      footer={
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zatvori
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {notes ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{notes}</p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Nema pojedinačnih stavki.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <th className="px-3 py-2 font-medium">Stavka</th>
                  <th className="px-3 py-2 text-right font-medium">Kol.</th>
                  <th className="px-3 py-2 text-right font-medium">Cijena</th>
                  <th className="px-3 py-2 text-right font-medium">Ukupno</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.name}-${index}`}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-900"
                  >
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(row.price)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatMoney(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  <td
                    colSpan={3}
                    className="px-3 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-300"
                  >
                    Ukupno
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                    {formatMoney(displayTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {(expense.attachments ?? []).length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Prilozi
            </p>
            <ExpenseAttachmentsList attachments={expense.attachments ?? []} />
          </div>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}
