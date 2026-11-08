import { useCallback, useEffect, useState } from 'react'

import api from '../../api/client'

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'DEAD_LETTER'

export type OutboxDiagnosticEvent = {
  id: string
  eventType: string
  status: string
  attempts: number
  nextAttemptAt: string
  lockedAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type OutboxDiagnostics = {
  generatedAt: string
  counts: Record<string, number>
  duePending: number
  staleProcessing: number
  recentEvents: OutboxDiagnosticEvent[]
}

export const OUTBOX_STATUSES: OutboxStatus[] = [
  'PENDING',
  'PROCESSING',
  'DELIVERED',
  'DEAD_LETTER',
]

/**
 * Podaci outbox dijagnostike + auditan ručni replay.
 *
 * Ponašanje je identično prijašnjem inline `useEffect`-u u `outbox-diagnostics.tsx`:
 * isti endpoint, ista validacija oblika odgovora, isti `AbortController` i isti
 * `confirmAtLeastOnce: true` na replay pozivu.
 */
export const useOutboxDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<OutboxDiagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [replayLoading, setReplayLoading] = useState(false)
  const [replayFailed, setReplayFailed] = useState(false)
  const [replaySucceeded, setReplaySucceeded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setFailed(false)
    api
      .get<OutboxDiagnostics>('/api/reservations/ops/outbox', { signal: controller.signal })
      .then(({ data }) => {
        if (
          !data ||
          typeof data !== 'object' ||
          !data.counts ||
          !Array.isArray(data.recentEvents)
        ) {
          throw new Error()
        }
        setDiagnostics(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey])

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), [])

  /**
   * Ručni replay je at-least-once: backend traži eksplicitnu potvrdu, pa se
   * `confirmAtLeastOnce: true` ne smije ukloniti ni podrazumijevati.
   */
  const submitReplay = useCallback(
    async (target: OutboxDiagnosticEvent) => {
      if (replayLoading) return false
      setReplayLoading(true)
      setReplayFailed(false)
      setReplaySucceeded(false)
      try {
        await api.post(
          `/api/reservations/ops/outbox/${encodeURIComponent(target.id)}/replay`,
          { confirmAtLeastOnce: true },
        )
        setReplaySucceeded(true)
        setRefreshKey((key) => key + 1)
        return true
      } catch {
        setReplayFailed(true)
        return false
      } finally {
        setReplayLoading(false)
      }
    },
    [replayLoading],
  )

  return {
    diagnostics,
    loading,
    failed,
    refresh,
    replayLoading,
    replayFailed,
    replaySucceeded,
    submitReplay,
  }
}
