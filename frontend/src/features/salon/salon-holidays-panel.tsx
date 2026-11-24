import { useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { SalonHolidayTable } from './salon-holiday-table'
import type { useSalonManagement } from './use-salon-management'

type Props = Pick<ReturnType<typeof useSalonManagement>,
  'holidays' | 'sortedHolidays' | 'holidayReadError' | 'holidayReloading' | 'reloadHolidays' |
  'openHolidayForm' | 'handleSendNotification' | 'handleDeleteHoliday'> & {
  holidayTabRef: RefObject<HTMLButtonElement>
}

export function SalonHolidaysPanel({ holidays, sortedHolidays, holidayReadError, holidayReloading, reloadHolidays, openHolidayForm, handleSendNotification, handleDeleteHoliday, holidayTabRef }: Props) {
  const { t } = useTranslation()
  const holidayRetryRef = useRef<HTMLButtonElement>(null)
  const retryHolidayRead = async () => {
    const trigger = holidayRetryRef.current
    const hadFocus = document.activeElement === trigger
    const succeeded = await reloadHolidays()
    if (succeeded && hadFocus && (document.activeElement === trigger || document.activeElement === document.body)) holidayTabRef.current?.focus()
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-content">{t('salon.holidays')}</p>
          <p className="text-xs text-content-strong">{t('salon.holidaysDescription')}</p>
        </div>
        <Button type="button" data-salon-holiday-action disabled={holidayReadError || holidayReloading} onClick={() => openHolidayForm()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('salon.newHoliday')}
        </Button>
      </div>

      {holidayReadError ? (
        <div role="alert" data-admin-state="error" className="mb-4 rounded-lg border border-line bg-surface-muted p-4 text-content">
          <p>{t('salon.errors.loadHolidaysFailed')}</p>
          {holidays.length > 0 ? <p className="mt-1 text-sm">{t('salon.errors.holidaysMayBeStale')}</p> : null}
          <p className="mt-1 text-sm">{t('salon.errors.holidaysActionsUnavailable')}</p>
          <Button ref={holidayRetryRef} type="button" data-salon-holiday-action variant="outline" className="mt-3" disabled={holidayReloading} onClick={() => void retryHolidayRead()}>
            {t('common.retry')}
          </Button>
          {holidayReloading ? <p role="status" className="mt-2 text-sm">{t('common.loading')}</p> : null}
        </div>
      ) : null}
      {holidayReloading && !holidayReadError ? <p role="status" className="mb-3 text-sm text-content-strong">{t('salon.errors.holidaysRefreshing')}</p> : null}
      {holidays.length === 0 ? (
        holidayReadError || holidayReloading ? null : <p className="text-sm text-content-strong">{t('salon.noHolidays')}</p>
      ) : (
        <SalonHolidayTable sortedHolidays={sortedHolidays} actionsDisabled={holidayReadError || holidayReloading} openHolidayForm={openHolidayForm}
          handleSendNotification={handleSendNotification} handleDeleteHoliday={handleDeleteHoliday} />
      )}
    </>
  )
}
