import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'

import { getIntlLocale } from '../i18n/locale-utils.mjs'
import {
  formatDateOnlyLocale,
} from '../../../shared/business-date.mjs'

import { AdminConfirmDialog } from '../features/shell/admin/ui/admin-confirm-dialog'
import { ErrorState } from '../features/shell/admin/ui/data-state'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { HolidayDialog } from '../features/salon/holiday-dialog'
import { CreateSalonForm } from '../features/salon/create-salon-form'
import { SalonSettingsForm } from '../features/salon/salon-settings-form'
import { SalonWorkingHoursTable } from '../features/salon/salon-working-hours-table'
import { SalonHolidayTable } from '../features/salon/salon-holiday-table'
import { useSalonManagement } from '../features/salon/use-salon-management'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

export default function Salon() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const {
    salon, loading, loadError, loadSalon, saving, confirmRequest, setConfirmRequest, noSalonExists,
    formData, setFormData, workingHours, holidays, sortedHolidays, holidaysSummary,
    holidayReadError, holidayReloading, reloadHolidays,
    holidayOpen, setHolidayOpen, editHoliday, holForm, setHolForm, updateWH,
    openHolidayForm, handleCreateSalon, handleSaveSettings, handleSaveWorkingHours,
    handleSaveHoliday, handleDeleteHoliday, handleSendNotification,
  } = useSalonManagement()
  const holidayTabRef = useRef<HTMLButtonElement>(null)
  const holidayRetryRef = useRef<HTMLButtonElement>(null)
  const retryHolidayRead = async () => {
    const trigger = holidayRetryRef.current
    const hadFocus = document.activeElement === trigger
    const succeeded = await reloadHolidays()
    if (succeeded && hadFocus && (document.activeElement === trigger || document.activeElement === document.body)) holidayTabRef.current?.focus()
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-content">{t('nav.salon')}</h1>
        <div role="status" className="flex justify-center p-10 text-content-strong">
          <span className="sr-only">{t('common.loading')}</span>
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-content">{t('nav.salon')}</h1>
        <ErrorState description={t('salon.errors.loadFailed')} onRetry={() => void loadSalon()} />
      </div>
    )
  }

  if (noSalonExists || !salon) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-content">{t('nav.salon')}</h1>
          <p className="mt-1 text-sm text-content-strong ">{t('salon.notConfigured')}</p>
        </div>

        <CreateSalonForm formData={formData} setFormData={setFormData} saving={saving} handleCreateSalon={handleCreateSalon} />
      </div>
    )
  }



  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-content">{t('nav.salon')}</h1>
          <p className="mt-1 text-sm text-content-strong ">{t('salon.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {holidaysSummary.map((h) => (
            <Badge key={h.id} variant="secondary">
              {formatDateOnlyLocale(h.date.slice(0, 10), locale)}: {h.name}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <div className="p-6">
          <Tabs defaultValue="general">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
              <TabsTrigger value="general">{t('salon.tabs.general')}</TabsTrigger>
              <TabsTrigger value="hours">{t('salon.tabs.workingHours')}</TabsTrigger>
              <TabsTrigger ref={holidayTabRef} value="holidays">{t('salon.tabs.holidays')}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <SalonSettingsForm formData={formData} setFormData={setFormData} saving={saving} handleSaveSettings={handleSaveSettings} />
            </TabsContent>

            <TabsContent value="hours" className="mt-4">
              <SalonWorkingHoursTable workingHours={workingHours} updateWH={updateWH} />

              <div className="mt-4 flex justify-end">
                <Button type="button" onClick={() => void handleSaveWorkingHours()} disabled={saving}>
                  {saving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="holidays" className="mt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-content">{t('salon.holidays')}</p>
                  <p className="text-xs text-content-strong">{t('salon.holidaysDescription')}</p>
                </div>
                <Button type="button" onClick={() => openHolidayForm()}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('salon.newHoliday')}
                </Button>
              </div>

              {holidayReadError ? (
                <div role="alert" data-admin-state="error" className="mb-4 rounded-lg border border-line bg-surface-muted p-4 text-content">
                  <p>{t('salon.errors.loadHolidaysFailed')}</p>
                  {holidays.length > 0 ? <p className="mt-1 text-sm">{t('salon.errors.holidaysMayBeStale')}</p> : null}
                  <Button ref={holidayRetryRef} type="button" variant="outline" className="mt-3" disabled={holidayReloading} onClick={() => void retryHolidayRead()}>
                    {t('common.retry')}
                  </Button>
                  {holidayReloading ? <p role="status" className="mt-2 text-sm">{t('common.loading')}</p> : null}
                </div>
              ) : null}
              {holidays.length === 0 ? (
                holidayReadError ? null : <p className="text-sm text-content-strong">{t('salon.noHolidays')}</p>
              ) : (
                <SalonHolidayTable sortedHolidays={sortedHolidays} openHolidayForm={openHolidayForm}
                  handleSendNotification={handleSendNotification} handleDeleteHoliday={handleDeleteHoliday} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      <HolidayDialog holidayOpen={holidayOpen} setHolidayOpen={setHolidayOpen} isEditing={Boolean(editHoliday)}
        holForm={holForm} setHolForm={setHolForm} saving={saving} onSave={() => void handleSaveHoliday()} />
      <AdminConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}
