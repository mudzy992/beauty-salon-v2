import { useTranslation } from 'react-i18next'
import { formatWeekday } from '../../i18n/locale-utils.mjs'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import type { WorkingHours } from './stylist-types'

type Props = { workingHours: WorkingHours[]; updateWH: (day: number, field: keyof WorkingHours, value: string | boolean) => void }
export function StylistWorkingHours({ workingHours, updateWH }: Props) {
  const { t, i18n } = useTranslation()
  const workingHoursColumns: DataTableColumn<WorkingHours>[] = [
    {
      key: 'day',
      headerKey: 'stylists.day',
      className: 'p-3 font-medium',
      render: (wh) => formatWeekday(wh.dayOfWeek, i18n.language),
    },
    {
      key: 'workingDay',
      headerKey: 'stylists.workingDay',
      className: 'p-3',
      render: (wh) => (
        <Switch
          aria-label={t('stylists.aria.workingDayToggle', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          checked={wh.isWorkingDay}
          onCheckedChange={(checked) => updateWH(wh.dayOfWeek, 'isWorkingDay', checked)}
        />
      ),
    },
    {
      key: 'start',
      headerKey: 'stylists.start',
      className: 'p-3',
      render: (wh) => (
        <Input
          type="time"
          aria-label={t('stylists.aria.startTime', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          className="h-9 w-[140px]"
          value={wh.startTime}
          onChange={(e) => updateWH(wh.dayOfWeek, 'startTime', e.target.value)}
          disabled={!wh.isWorkingDay}
        />
      ),
    },
    {
      key: 'end',
      headerKey: 'stylists.end',
      className: 'p-3',
      render: (wh) => (
        <Input
          type="time"
          aria-label={t('stylists.aria.endTime', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          className="h-9 w-[140px]"
          value={wh.endTime}
          onChange={(e) => updateWH(wh.dayOfWeek, 'endTime', e.target.value)}
          disabled={!wh.isWorkingDay}
        />
      ),
    },
  ]

  return (
    <div className="app-table-wrap rounded-md border border-line ">
      <DataTable
        caption={t('stylists.workingHoursCaption')}
        columns={workingHoursColumns}
        rows={workingHours}
        rowKey={(wh) => String(wh.dayOfWeek)}
        rowClassName={(wh) => (!wh.isWorkingDay ? 'opacity-60' : undefined)}
      />
    </div>
  )
}
