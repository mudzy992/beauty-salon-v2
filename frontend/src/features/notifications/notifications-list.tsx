import { useTranslation } from 'react-i18next'
import { formatLocalizedDateTime } from '../../i18n/locale-utils.mjs'
import { Check, Loader2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Switch } from '../../components/ui/switch'
import { useNotificationLabels } from './notification-labels'
import { channelBadgeVariant, type Notification } from './notification-types'

/**
 * Lista obavijesti u admin panelu (S9).
 *
 * Markup prenesen iz `pages/Notifications.tsx` bez promjene: isti filter
 * „samo nepročitane“ (`aria-labelledby` na vidljivi tekst), iste kartice
 * (pročitana / nepročitana sa `border-l-4 border-l-info-foreground bg-info`),
 * isti `Badge` po kanalu i isto dugme „označi kao pročitano“ sa **jedinstvenim**
 * imenom po obavijesti (2.4.4).
 */
export function NotificationsList({
  notifications,
  loading,
  showUnreadOnly,
  onShowUnreadOnlyChange,
  onMarkAsRead,
}: {
  notifications: Notification[]
  loading: boolean
  showUnreadOnly: boolean
  onShowUnreadOnlyChange: (checked: boolean) => void
  onMarkAsRead: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const { getNotificationTypeLabel, getChannelLabel } = useNotificationLabels()

  return (
    <>
      <div className="mb-4 flex max-w-xs items-center justify-between gap-3">
        <span className="text-sm text-content-strong" id="unread-only-label">
          {t('notifications.unreadOnly')}
        </span>
        <Switch
          checked={showUnreadOnly}
          onCheckedChange={onShowUnreadOnlyChange}
          aria-labelledby="unread-only-label"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-content-strong">
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-label={t('common.loading')} />
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-content-strong">{t('common.noData')}</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={
                n.isRead
                  ? 'p-4'
                  : 'border-l-4 border-l-info-foreground bg-info p-4'
              }
            >
              <div className="flex justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-content">{n.title}</p>
                    <Badge variant={channelBadgeVariant(n.channel)} className="text-[10px]">
                      {getChannelLabel(n.channel)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {getNotificationTypeLabel(n.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-content-strong">{n.body}</p>
                  <p className="mt-1 text-xs text-content-strong">{formatLocalizedDateTime(n.sentAt, i18n.language)}</p>
                </div>
                {!n.isRead ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-ok-foreground hover:text-ok-foreground"
                    aria-label={t('notifications.markAsReadNamed', { title: n.title })}
                    onClick={() => void onMarkAsRead(n.id)}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
