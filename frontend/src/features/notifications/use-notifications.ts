import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useSocketEvent } from '../../context/SocketContext'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { CampaignEmailConsent, Notification, NotifPreference } from './notification-types'

/**
 * Stanje i akcije admin obavijesti (S9).
 *
 * Izdvojeno iz `pages/Notifications.tsx` bez promjene ponašanja: isti endpointi
 * (`/api/notifications`, `/api/notifications/preferences`,
 * `/api/notifications/campaigns/consent`), isti socket događaj
 * `notification:new`, iste poruke i isti redoslijed učitavanja.
 */
export function useNotifications() {
  const { t } = useTranslation()
  const { error, success } = useAppToast()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const [preferences, setPreferences] = useState<NotifPreference[]>([])
  const [prefLoading, setPrefLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [campaignConsent, setCampaignConsent] = useState<CampaignEmailConsent | null>(null)
  const [campaignConsentLoading, setCampaignConsentLoading] = useState(true)
  const [campaignConsentLoadFailed, setCampaignConsentLoadFailed] = useState(false)
  const [savingCampaignConsent, setSavingCampaignConsent] = useState(false)

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

  const loadCampaignConsent = useCallback(() => {
    setCampaignConsentLoading(true)
    api
      .get<CampaignEmailConsent>('/api/notifications/campaigns/consent')
      .then((r) => {
        setCampaignConsent(r.data)
        setCampaignConsentLoadFailed(false)
      })
      .catch(() => {
        setCampaignConsentLoadFailed(true)
      })
      .finally(() => setCampaignConsentLoading(false))
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])
  useEffect(() => {
    loadCampaignConsent()
  }, [loadCampaignConsent])

  useSocketEvent('notification:new', useCallback(() => loadNotifications(), [loadNotifications]))

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      loadNotifications()
    } catch {
      error(t('notifications.markReadFailed'))
    }
  }

  const savePreference = async (type: string, pushEnabled: boolean, emailEnabled: boolean) => {
    setSaving(true)
    try {
      await api.post('/api/notifications/preferences', { type, pushEnabled, emailEnabled })
      success(t('notifications.preferencesSaved'))
      loadPreferences()
    } catch {
      error(t('notifications.preferencesSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const saveCampaignConsent = async (optedIn: boolean) => {
    setSavingCampaignConsent(true)
    try {
      const { data } = await api.put<CampaignEmailConsent>(
        '/api/notifications/campaigns/consent',
        { optedIn },
      )
      setCampaignConsent(data)
      setCampaignConsentLoadFailed(false)
      success(t('notifications.campaignConsent.saved'))
    } catch {
      error(t('notifications.campaignConsent.saveFailed'))
    } finally {
      setSavingCampaignConsent(false)
    }
  }

  return {
    notifications,
    loading,
    showUnreadOnly,
    setShowUnreadOnly,
    preferences,
    prefLoading,
    saving,
    campaignConsent,
    campaignConsentLoading,
    campaignConsentLoadFailed,
    savingCampaignConsent,
    loadNotifications,
    loadPreferences,
    loadCampaignConsent,
    markAsRead,
    savePreference,
    saveCampaignConsent,
  }
}
