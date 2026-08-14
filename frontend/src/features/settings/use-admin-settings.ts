import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { useSocketEvent } from '../../context/SocketContext'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AppSetting, RegistryItem } from './types'

export function useAdminSettings() {
  const { success, error } = useAppToast()
  const { refreshSettings } = useSettings()
  const [settingsList, setSettingsList] = useState<AppSetting[]>([])
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api.get<AppSetting[]>('/api/settings'), api.get<RegistryItem[]>('/api/settings/registry')])
      .then(([settingsRes, registryRes]) => {
        setSettingsList(Array.isArray(settingsRes.data) ? settingsRes.data : [])
        setRegistry(Array.isArray(registryRes.data) ? registryRes.data : [])
      })
      .catch(() => {
        setSettingsList([])
        setRegistry([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useSocketEvent(
    'settings:updated',
    useCallback(() => {
      loadData()
      void refreshSettings()
    }, [loadData, refreshSettings]),
  )

  const handleSave = async (key: string, value: string, desc: string) => {
    try {
      await api.put(`/api/settings/${key}`, { value, description: desc })
      success('Postavka sačuvana')
      loadData()
      void refreshSettings()
    } catch {
      error('Greška pri čuvanju')
      throw new Error('Save failed')
    }
  }

  const registryMap = useMemo(() => new Map(registry.map((r) => [r.key, r])), [registry])

  return { settingsList, registry, registryMap, loading, handleSave, loadData }
}
