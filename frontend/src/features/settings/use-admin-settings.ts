import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { useSocketEvent } from '../../context/SocketContext'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AppSetting, RegistryItem } from './types'

export function useAdminSettings() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()
  const { refreshSettings } = useSettings()
  const [settingsList, setSettingsList] = useState<AppSetting[]>([])
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const loadRequestId = useRef(0)

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestId.current
    setLoading(true)
    setLoadError(false)
    try {
      const [settingsRes, registryRes] = await Promise.all([
        api.get<AppSetting[]>('/api/settings'),
        api.get<RegistryItem[]>('/api/settings/registry'),
      ])
      if (requestId !== loadRequestId.current) return
      if (!Array.isArray(settingsRes.data) || !Array.isArray(registryRes.data)) {
        throw new Error('Invalid admin settings response')
      }
      setSettingsList(settingsRes.data)
      setRegistry(registryRes.data)
    } catch {
      if (requestId === loadRequestId.current) setLoadError(true)
    } finally {
      if (requestId === loadRequestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
    return () => {
      loadRequestId.current += 1
    }
  }, [loadData])

  useSocketEvent(
    'settings:updated',
    useCallback(() => {
      void loadData()
      void refreshSettings()
    }, [loadData, refreshSettings]),
  )

  const handleSave = async (key: string, value: string, desc: string) => {
    try {
      await api.put(`/api/settings/${key}`, { value, description: desc })
      success(t('adminSettings.editor.saveSuccess'))
      void loadData()
      void refreshSettings()
    } catch {
      error(t('adminSettings.editor.saveFailed'))
      throw new Error('Save failed')
    }
  }

  const registryMap = useMemo(() => new Map(registry.map((r) => [r.key, r])), [registry])

  return { settingsList, registry, registryMap, loading, loadError, handleSave, loadData }
}
