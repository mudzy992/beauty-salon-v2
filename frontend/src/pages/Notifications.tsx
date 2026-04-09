import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Check, Loader2 } from 'lucide-react'
import api from '../api/client'
import { useSocketEvent } from '../context/SocketContext'
import { useAppToast } from '../lib/toast/useAppToast'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  channel: string
  isRead: boolean
  sentAt: string
  readAt: string | null
}

interface NotifPreference {
  id: string
  type: string
  pushEnabled: boolean
  emailEnabled: boolean
}

const channelBadgeVariant = (channel: string): 'secondary' | 'brand' | 'outline' => {
  if (channel === 'PUSH') return 'secondary'
  if (channel === 'EMAIL') return 'brand'
  return 'outline'
}

export default function Notifications() {
  const { t } = useTranslation()
  const { error, success } = useAppToast()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const [preferences, setPreferences] = useState<NotifPreference[]>([])
  const [prefLoading, setPrefLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadNotifications = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (showUnreadOnly) params.unreadOnly = 'true'
    api
      .get<Notification[]>('/api/notifications', { params })
      .then((r) => setNotifications(Array.isArray(r.data) ? r.data : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [showUnreadOnly])

  const loadPreferences = useCallback(() => {
    setPrefLoading(true)
    api
      .get<NotifPreference[]>('/api/notifications/preferences')
      .then((r) => setPreferences(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPreferences([]))
      .finally(() => setPrefLoading(false))
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useSocketEvent('notification:new', useCallback(() => loadNotifications(), [loadNotifications]))

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      loadNotifications()
    } catch {
      error('Greška')
    }
  }

  const savePreference = async (type: string, pushEnabled: boolean, emailEnabled: boolean) => {
    setSaving(true)
    try {
      await api.post('/api/notifications/preferences', { type, pushEnabled, emailEnabled })
      success('Preference sačuvane')
      loadPreferences()
    } catch {
      error('Greška')
    } finally {
      setSaving(false)
    }
  }

  const NOTIFICATION_TYPES = [
    'RESERVATION_NEW',
    'RESERVATION_CONFIRMED',
    'RESERVATION_CANCELLED',
    'RESERVATION_REMINDER',
    'HOLIDAY',
    'REVIEW_NEW',
    'GENERAL',
  ]

  const getExistingPref = (type: string) => preferences.find((p) => p.type === type)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.notifications')}</h1>
        <Button asChild variant="outline" size="icon" aria-label="Email postavke" title="Email postavke">
          <RouterLink to="/admin/email-settings">
            <Bell className="h-4 w-4" />
          </RouterLink>
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Notifikacije</TabsTrigger>
          <TabsTrigger value="prefs">Preference</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="mb-4 flex max-w-xs items-center justify-between gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-200" id="unread-only-label">
              Samo nepročitane
            </span>
            <Switch
              checked={showUnreadOnly}
              onCheckedChange={setShowUnreadOnly}
              aria-labelledby="unread-only-label"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-slate-500">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={
                    n.isRead
                      ? 'p-4'
                      : 'border-l-4 border-l-blue-500 bg-blue-50/80 p-4 dark:border-l-blue-400 dark:bg-blue-950/20'
                  }
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{n.title}</p>
                        <Badge variant={channelBadgeVariant(n.channel)} className="text-[10px]">
                          {n.channel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {n.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{n.body}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(n.sentAt).toLocaleString('bs-BA')}</p>
                    </div>
                    {!n.isRead ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-emerald-600 hover:text-emerald-700"
                        aria-label="Označi kao pročitano"
                        onClick={() => void markAsRead(n.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prefs" className="mt-4">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Konfiguriši kako želiš primati notifikacije za svaki tip.
          </p>
          {prefLoading ? (
            <div className="flex justify-center py-8 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="p-3 font-medium">Tip notifikacije</th>
                      <th className="p-3 font-medium">Push</th>
                      <th className="p-3 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NOTIFICATION_TYPES.map((type) => {
                      const pref = getExistingPref(type)
                      const pushEnabled = pref?.pushEnabled ?? true
                      const emailEnabled = pref?.emailEnabled ?? true
                      return (
                        <tr key={type} className="border-b border-slate-100 dark:border-slate-800/80">
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-100">
                            {type.replace(/_/g, ' ')}
                          </td>
                          <td className="p-3">
                            <Switch
                              checked={pushEnabled}
                              onCheckedChange={(checked) => void savePreference(type, checked, emailEnabled)}
                              disabled={saving}
                              aria-label={`Push za ${type}`}
                            />
                          </td>
                          <td className="p-3">
                            <Switch
                              checked={emailEnabled}
                              onCheckedChange={(checked) => void savePreference(type, pushEnabled, checked)}
                              disabled={saving}
                              aria-label={`Email za ${type}`}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
