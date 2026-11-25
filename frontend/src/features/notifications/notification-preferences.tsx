import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import { Switch } from '../../components/ui/switch'
import { useNotificationLabels } from './notification-labels'
import { NOTIFICATION_TYPES, type NotificationType, type NotifPreference } from './notification-types'

/**
 * Preferencije obavijesti (S9).
 *
 * Markup prenesen iz `pages/Notifications.tsx` bez promjene: isti `DataTable`
 * sa `caption`, isti `headerKey` redoslijed (`notificationType`, `push`,
 * `email`), iste `aria-label` vrijednosti za prekidače (sa imenom tipa) i isti
 * nezavisan blok za saglasnost sa kampanjama.
 */
export function NotificationPreferences({
  preferences,
  prefLoading,
  saving,
  campaignConsent,
  campaignConsentLoading,
  campaignConsentLoadFailed,
  savingCampaignConsent,
  onSavePreference,
  onSaveCampaignConsent,
  onRetryLoadConsent,
}: {
  preferences: NotifPreference[]
  prefLoading: boolean
  saving: boolean
  campaignConsent: { optedIn: boolean } | null
  campaignConsentLoading: boolean
  campaignConsentLoadFailed: boolean
  savingCampaignConsent: boolean
  onSavePreference: (type: string, pushEnabled: boolean, emailEnabled: boolean) => void
  onSaveCampaignConsent: (optedIn: boolean) => void
  onRetryLoadConsent: () => void
}) {
  const { t } = useTranslation()
  const { getNotificationTypeLabel } = useNotificationLabels()

  const getExistingPref = (type: string) => preferences.find((p) => p.type === type)

  const preferenceColumns: DataTableColumn<NotificationType>[] = [
    {
      key: 'type',
      headerKey: 'notifications.notificationType',
      className: 'p-3 font-medium text-content',
      render: (type) => getNotificationTypeLabel(type),
    },
    {
      key: 'push',
      headerKey: 'notifications.push',
      className: 'p-3',
      render: (type) => {
        const pref = getExistingPref(type)
        return (
          <Switch
            checked={pref?.pushEnabled ?? true}
            onCheckedChange={(checked) =>
              void onSavePreference(type, checked, pref?.emailEnabled ?? true)
            }
            disabled={saving}
            aria-label={t('notifications.pushPreferenceLabel', { type: getNotificationTypeLabel(type) })}
          />
        )
      },
    },
    {
      key: 'email',
      headerKey: 'notifications.email',
      className: 'p-3',
      render: (type) => {
        const pref = getExistingPref(type)
        return (
          <Switch
            checked={pref?.emailEnabled ?? true}
            onCheckedChange={(checked) =>
              void onSavePreference(type, pref?.pushEnabled ?? true, checked)
            }
            disabled={saving}
            aria-label={t('notifications.emailPreferenceLabel', { type: getNotificationTypeLabel(type) })}
          />
        )
      },
    },
  ]

  return (
    <>
      <p className="mb-4 text-sm text-content-strong ">
        {t('notifications.preferencesDescription')}
      </p>
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <h2 className="font-semibold text-content">
              {t('notifications.campaignConsent.title')}
            </h2>
            <p className="text-sm text-content-strong">
              {t('notifications.campaignConsent.description')}
            </p>
            {campaignConsent ? (
              <p className="text-sm font-medium text-content-strong">
                {campaignConsent.optedIn
                  ? t('notifications.campaignConsent.enabled')
                  : t('notifications.campaignConsent.disabled')}
              </p>
            ) : null}
          </div>
          {campaignConsentLoading ? (
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-content-strong" aria-label={t('common.loading')} />
          ) : campaignConsentLoadFailed ? (
            <Button type="button" variant="outline" onClick={onRetryLoadConsent}>
              {t('notifications.campaignConsent.retryLoad')}
            </Button>
          ) : (
            <Switch
              checked={campaignConsent?.optedIn ?? false}
              onCheckedChange={(checked) => void onSaveCampaignConsent(checked)}
              disabled={savingCampaignConsent || !campaignConsent}
              aria-label={t('notifications.campaignConsent.optIn')}
            />
          )}
        </div>
        {campaignConsentLoadFailed ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {t('notifications.campaignConsent.loadFailed')}
          </p>
        ) : null}
      </Card>
      {prefLoading ? (
        <div className="flex justify-center py-8 text-content-strong">
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-label={t('common.loading')} />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            caption={t('notifications.preferencesTableCaption')}
            columns={preferenceColumns}
            rows={[...NOTIFICATION_TYPES]}
            rowKey={(type) => type}
          />
        </Card>
      )}
    </>
  )
}
