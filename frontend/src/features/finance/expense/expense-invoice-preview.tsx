import { Button } from '../../../components/ui/button'
import { ResponsiveDialog } from '../components/responsive-dialog'
import { ExpenseAttachmentsList } from './expense-attachments'
import { parseExpenseNotes } from './expense-notes'
import { computeLineTotal, labelFromLineValues } from './expense-line-roles'
import { sumLineItems } from './expenses.helpers'
import { formatIsoDateBs, formatMoney, toNumber } from '../finance.utils'
import type { Expense, TemplateField } from '../finance.types'

type Props = {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewRow = { name: string; qty: string; price: string; total: number }

const rowsFromExpense = (expense: Expense): PreviewRow[] => {
  if (expense.category?.isFixed) {
    return (expense.fieldValues ?? []).map((fv) => {
      const price = toNumber(fv.value)
      return {
        name: fv.field?.fieldName ?? 'Polje',
        qty: '1',
        price: String(price),
        total: price,
      }
    })
  }
  const fields: TemplateField[] = [...(expense.category?.template?.fields ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  const items = parseExpenseNotes(expense.notes, fields).lineItems
  return items.map((item) => ({
    name: labelFromLineValues(fields, item.values) || 'Stavka',
    qty: '—',
    price: '—',
    total: computeLineTotal(fields, item.values),
  }))
}

export function ExpenseInvoicePreview({ expense, open, onOpenChange }: Props) {
  if (!expense) return null

  const fields = [...(expense.category?.template?.fields ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  const rows = rowsFromExpense(expense)
  const notes = expense.category?.isFixed
    ? expense.notes ?? ''
    : parseExpenseNotes(expense.notes, fields).userNotes
  const computedTotal = expense.category?.isFixed
    ? rows.reduce((sum, row) => sum + row.total, 0)
    : sumLineItems(parseExpenseNotes(expense.notes, fields).lineItems, fields)
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
          <div className="app-table-wrap rounded-md border border-slate-200 dark:border-slate-800">
            <table className="app-table w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <th className="px-3 py-2 font-medium">Stavka</th>
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
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatMoney(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  <td className="px-3 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-300">
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
