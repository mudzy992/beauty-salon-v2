import { useTranslation } from 'react-i18next'
import { Send, Trash2 } from 'lucide-react'
import { formatLocalizedDateTime, getIntlLocale } from '../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import type { Holiday } from './salon-types'

type Props = { sortedHolidays: Holiday[]; openHolidayForm: (holiday?: Holiday) => void; handleSendNotification: (id: string) => Promise<void>; handleDeleteHoliday: (id: string) => void }
export function SalonHolidayTable({ sortedHolidays, openHolidayForm, handleSendNotification, handleDeleteHoliday }: Props) {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const holidayAccessibleName = (holiday: Holiday) => {
    const date = holiday.date.slice(0, 10)
    const sameNameAndDate = sortedHolidays.filter((item) => item.name === holiday.name && item.date.slice(0, 10) === date)
    const suffix = sameNameAndDate.length > 1 ? ` (${sameNameAndDate.findIndex((item) => item.id === holiday.id) + 1})` : ''
    return `${holiday.name} — ${formatDateOnlyLocale(date, locale)}${suffix}`
  }
  const holidayColumns: DataTableColumn<Holiday>[] = [
    {
      key: 'date',
      headerKey: 'salon.holidayTable.date',
      className: 'p-3',
      render: (h) => formatDateOnlyLocale(h.date.slice(0, 10), locale),
    },
    {
      key: 'name',
      headerKey: 'salon.holidayTable.name',
      className: 'p-3 font-medium text-content',
      render: (h) => h.name,
    },
    {
      key: 'push',
      headerKey: 'salon.holidayTable.push',
      className: 'p-3',
      render: (h) => (
        <Badge variant={h.sendPush ? 'success' : 'secondary'}>
          {h.sendPush ? t('common.yes') : t('common.no')}
        </Badge>
      ),
    },
    {
      key: 'sent',
      headerKey: 'salon.holidayTable.sent',
      className: 'p-3',
      render: (h) => (h.pushSentAt ? formatLocalizedDateTime(h.pushSentAt, i18n.language) : '—'),
    },
    {
      key: 'actions',
      headerKey: 'salon.holidayTable.actions',
      align: 'right',
      className: 'p-3',
      render: (h) => (
        <div className="flex justify-end gap-1">
          {h.sendPush ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={t('salon.aria.sendHolidayNotification', { name: holidayAccessibleName(h) })}
              onClick={() => void handleSendNotification(h.id)}
            >
              <Send className="h-4 w-4 text-teal-600" aria-hidden="true" />
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" aria-label={t('salon.aria.editHoliday', { name: holidayAccessibleName(h) })} onClick={() => openHolidayForm(h)}>
            {t('common.edit')}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('salon.aria.deleteHoliday', { name: holidayAccessibleName(h) })}
            onClick={() => void handleDeleteHoliday(h.id)}
          >
            <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="app-table-wrap rounded-md border border-line ">
      <DataTable caption={t('salon.holidaysCaption')} columns={holidayColumns}
        rows={sortedHolidays} rowKey={(h) => h.id} />
    </div>
  )
}
