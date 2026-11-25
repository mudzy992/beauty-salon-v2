import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'
import type { ServiceDeletionImpact } from './service-deletion-types'

type Params = { showApiError: (err: unknown, fallbackKey: string) => void }

/**
 * Pregled posljedica brisanja ili spajanja usluge.
 *
 * Svako čitanje nosi vlastitu generaciju, pa odziv koji stigne nakon zatvaranja
 * ili promjene odabira ne može prepisati noviji pregled.
 */
export function useServiceDeletionPreview({ showApiError }: Params) {
  const [impact, setImpact] = useState<ServiceDeletionImpact | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const generation = useRef(0)

  useEffect(() => () => { generation.current += 1 }, [])

  const invalidate = useCallback(() => {
    generation.current += 1
    setImpact(null)
    setLoadError(false)
    setLoading(false)
  }, [])

  const load = useCallback(async (serviceId: string, targetServiceId?: string) => {
    const current = ++generation.current
    setLoading(true)
    setLoadError(false)
    try {
      const { data } = await api.get<ServiceDeletionImpact>(
        `/api/services/admin/services/${serviceId}/deletion-impact`,
        { params: targetServiceId ? { targetServiceId } : undefined },
      )
      if (current !== generation.current) return
      setImpact(data)
    } catch (err) {
      if (current !== generation.current) return
      setImpact(null)
      setLoadError(true)
      showApiError(err, 'services.errors.deleteServiceFailed')
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [showApiError])

  return { impact, setImpact, loading, loadError, load, invalidate }
}
