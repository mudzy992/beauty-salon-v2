import type { ChangeEvent } from 'react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { getCalendarMonthRange } from '../../../lib/date-range'

export type ReservationStatusOption = { value: string; label: string }

type Props = {
  fromDate: string
  toDate: string
  statusFilter: string
  clientSearch: string
  statusOptions: readonly ReservationStatusOption[]
  onFromDateChange: (v: string) => void
  onToDateChange: (v: string) => void
  onStatusChange: (v: string) => void
  onClientSearchChange: (v: string) => void
  onReset: () => void
}

export const resetReservationFilters = (): {
  fromDate: string
  toDate: string
  statusFilter: string
  clientSearch: string
} => {
  const range = getCalendarMonthRange()
  return {
    fromDate: range.fromDate,
    toDate: range.toDate,
    statusFilter: '',
    clientSearch: '',
  }
}

export const ReservationFilters = ({
  fromDate,
  toDate,
  statusFilter,
  clientSearch,
  statusOptions,
  onFromDateChange,
  onToDateChange,
  onStatusChange,
  onClientSearchChange,
  onReset,
}: Props) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
    <div className="space-y-2">
      <Label htmlFor="res-from">Od datuma</Label>
      <Input
        id="res-from"
        type="date"
        value={fromDate}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onFromDateChange(e.target.value)}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="res-to">Do datuma</Label>
      <Input
        id="res-to"
        type="date"
        value={toDate}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onToDateChange(e.target.value)}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="res-status">Status</Label>
      <select
        id="res-status"
        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
        value={statusFilter}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onStatusChange(e.target.value)}
      >
        {statusOptions.map((s) => (
          <option key={s.value || 'all'} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="res-client">Klijent (ime / prezime)</Label>
      <Input
        id="res-client"
        type="search"
        placeholder="npr. Ana Marić"
        value={clientSearch}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onClientSearchChange(e.target.value)}
        aria-label="Pretraga po imenu i prezimenu klijenta"
      />
    </div>
    <div className="flex items-end">
      <Button type="button" variant="outline" className="w-full" onClick={onReset}>
        Resetuj
      </Button>
    </div>
  </div>
)
