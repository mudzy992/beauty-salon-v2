import { useTranslation } from 'react-i18next'
import { formatWeekday } from '../../i18n/locale-utils.mjs'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'
import type { WorkingHours } from './salon-types'

type Props = { workingHours: WorkingHours[]; updateWH: (day: number, field: keyof WorkingHours, value: string | boolean) => void }
export function SalonWorkingHoursTable({ workingHours, updateWH }: Props) {
  const { t, i18n } = useTranslation()
  const workingHoursColumns: DataTableColumn<WorkingHours>[] = [
    {
      key: 'day',
      headerKey: 'salon.workingHoursTable.day',
      className: 'p-3 font-medium text-content',
      render: (wh) => formatWeekday(wh.dayOfWeek, i18n.language),
    },
    {
      key: 'workday',
      headerKey: 'salon.workingHoursTable.workday',
      className: 'p-3',
      render: (wh) => (
        <Switch
          aria-label={t('salon.aria.workingDayToggle', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          checked={wh.isWorkingDay}
          onCheckedChange={(checked) => updateWH(wh.dayOfWeek, 'isWorkingDay', checked)}
        />
      ),
    },
    {
      key: 'opens',
      headerKey: 'salon.workingHoursTable.opens',
      className: 'p-3',
      render: (wh) => (
        <Input
          type="time"
          aria-label={t('salon.aria.opensTime', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          className="h-9 w-[140px]"
          value={wh.openTime}
          disabled={!wh.isWorkingDay}
          onChange={(e) => updateWH(wh.dayOfWeek, 'openTime', e.target.value)}
        />
      ),
    },
    {
      key: 'closes',
      headerKey: 'salon.workingHoursTable.closes',
      className: 'p-3',
      render: (wh) => (
        <Input
          type="time"
          aria-label={t('salon.aria.closesTime', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          className="h-9 w-[140px]"
          value={wh.closeTime}
          disabled={!wh.isWorkingDay}
          onChange={(e) => updateWH(wh.dayOfWeek, 'closeTime', e.target.value)}
        />
      ),
    },
  ]

  return (
    <div className="app-table-wrap rounded-md border border-line ">
      <DataTable caption={t('salon.workingHoursCaption')} columns={workingHoursColumns}
        rows={workingHours} rowKey={(wh) => String(wh.dayOfWeek)}
        rowClassName={(wh) => (!wh.isWorkingDay ? 'opacity-60' : undefined)} />
    </div>
  )
}
