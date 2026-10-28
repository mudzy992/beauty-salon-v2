import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Drawer, DrawerContent } from '../../components/ui/drawer'
import { useIsMobile } from '../../hooks/use-is-mobile'
import {
  getServiceAmount,
  getSettledDebtsSum,
  getTipAmount,
  getTotalAmount,
} from './amounts'
import {
  clientLabel,
  formatDetailKm,
  serviceRows,
  statusLabel,
  statusVariant,
} from './entry-detail-helpers'
import { LoyaltyDiscountLine } from './entry-table-helpers'
import type { DailyLogEntry } from './types'
import { getStylistName } from './types'

type Props = {
  entry: DailyLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DailyLogEntryDetailDialog = ({
  entry,
  open,
  onOpenChange,
}: Props) => {
  const isMobile = useIsMobile()
  if (!entry) return null

  const title =
    entry.publicReferenceCode ?? entry.date?.slice(0, 10) ?? 'Detalji zapisa'
  const services = serviceRows(entry)
  const debts = entry.debtPaymentEntries ?? []
  const tip = getTipAmount(entry)
  const serviceAmt = getServiceAmount(entry)
  const debtsSum = getSettledDebtsSum(entry)
  const total = getTotalAmount(entry)

  const body = (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(entry)} className="text-[10px]">
          {statusLabel(entry)}
        </Badge>
        <Badge
          variant={entry.isManual ? 'warning' : 'secondary'}
          className="text-[10px]"
        >
          {entry.isManual ? 'Ručno' : 'Rezervacija'}
        </Badge>
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Datum</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-50">
            {entry.date?.slice(0, 10) ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Stilista</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-50">
            {getStylistName(entry.stylistProfile)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Klijent</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-50">
            {clientLabel(entry)}
          </dd>
        </div>
        {entry.publicReferenceCode ? (
          <div>
            <dt className="text-xs text-slate-500">Ref.</dt>
            <dd className="font-mono text-xs font-medium text-slate-900 dark:text-slate-50">
              {entry.publicReferenceCode}
            </dd>
          </div>
        ) : null}
      </dl>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Servisi
        </p>
        {services.length === 0 ? (
          <p className="mt-1 text-slate-500">—</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {services.map((row) => (
              <li
                key={row.key}
                className="flex justify-between gap-3 text-slate-700 dark:text-slate-200"
              >
                <span>{row.name}</span>
                <span className="tabular-nums shrink-0">
                  {formatDetailKm(row.price)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <LoyaltyDiscountLine entry={entry} />
      </div>
      {debts.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Naplata dugovanja
          </p>
          <ul className="mt-1 space-y-1">
            {debts.map((dp) => (
              <li
                key={dp.id}
                className="flex justify-between gap-3 text-slate-700 dark:text-slate-200"
              >
                <span>
                  {dp.debt?.service?.name ?? dp.service?.name ?? 'Dug'}
                  {dp.debt?.createdAt
                    ? ` · ${String(dp.debt.createdAt).slice(0, 10)}`
                    : ''}
                </span>
                <span className="tabular-nums shrink-0">
                  {formatDetailKm(Number(dp.actualPrice ?? 0))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex justify-between tabular-nums">
          <span className="text-slate-600 dark:text-slate-300">Servisi</span>
          <span>{formatDetailKm(serviceAmt)}</span>
        </div>
        {debtsSum > 0 ? (
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">Dugovi</span>
            <span>{formatDetailKm(debtsSum)}</span>
          </div>
        ) : null}
        {tip > 0 ? (
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">
              Napojnica
            </span>
            <span>{formatDetailKm(tip)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold tabular-nums dark:border-slate-800">
          <span>Ukupno</span>
          <span>{formatDetailKm(total)}</span>
        </div>
      </div>
      {entry.notes ? (
        <div>
          <p className="text-xs text-slate-500">Bilješke</p>
          <p className="mt-0.5 text-slate-900 dark:text-slate-50">
            {entry.notes}
          </p>
        </div>
      ) : null}
      {entry.deletedAt && entry.deleteReason ? (
        <p className="text-xs text-rose-600">
          Razlog brisanja: {entry.deleteReason}
        </p>
      ) : null}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent side="right" className="max-w-lg overflow-y-auto p-4">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          {body}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
