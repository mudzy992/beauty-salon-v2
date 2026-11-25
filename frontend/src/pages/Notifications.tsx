import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'

import { Button } from '../components/ui/button'
import { NotificationPreferences } from '../features/notifications/notification-preferences'
import { NotificationsList } from '../features/notifications/notifications-list'
import { useNotifications } from '../features/notifications/use-notifications'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

/**
 * Admin obavijesti (S9).
 *
 * Stranica je **orkestrator**: stanje i akcije su u
 * `features/notifications/use-notifications.ts`, lista u `notifications-list.tsx`,
 * a preferencije (uključujući nezavisni blok saglasnosti za kampanje) u
 * `notification-preferences.tsx`. Endpointi, poruke i markup su
 * **nepromijenjeni**.
 */
export default function Notifications() {
  const { t } = useTranslation()
  const notifications = useNotifications()

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-content">{t('nav.notifications')}</h1>
        <Button asChild variant="outline" size="icon" aria-label={t('nav.emailSettings')} title={t('nav.emailSettings')}>
          <RouterLink to="/admin/email-settings">
            <Bell className="h-4 w-4" />
          </RouterLink>
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">{t('notifications.list')}</TabsTrigger>
          <TabsTrigger value="prefs">{t('notifications.preferences')}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <NotificationsList
            notifications={notifications.notifications}
            loading={notifications.loading}
            showUnreadOnly={notifications.showUnreadOnly}
            onShowUnreadOnlyChange={notifications.setShowUnreadOnly}
            onMarkAsRead={(id) => void notifications.markAsRead(id)}
          />
        </TabsContent>

        <TabsContent value="prefs" className="mt-4">
          <NotificationPreferences
            preferences={notifications.preferences}
            prefLoading={notifications.prefLoading}
            saving={notifications.saving}
            campaignConsent={notifications.campaignConsent}
            campaignConsentLoading={notifications.campaignConsentLoading}
            campaignConsentLoadFailed={notifications.campaignConsentLoadFailed}
            savingCampaignConsent={notifications.savingCampaignConsent}
            onSavePreference={(type, push, email) => void notifications.savePreference(type, push, email)}
            onSaveCampaignConsent={(optedIn) => void notifications.saveCampaignConsent(optedIn)}
            onRetryLoadConsent={notifications.loadCampaignConsent}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
