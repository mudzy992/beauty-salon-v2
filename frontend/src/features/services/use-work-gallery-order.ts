import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAuthStore } from '../../stores/auth.store'
import type { BeforeAfterPair } from './work-gallery-page'
import { isWorkGalleryRevision } from './work-gallery-revision'

export function useWorkGalleryOrder(serviceId: string, sessionVersion: number, headingRef: { current: HTMLElement | null }, onChanged: () => void) {
  const { t } = useTranslation()
  const owner = JSON.stringify([serviceId, sessionVersion])
  const ownerRef = useRef(owner)
  ownerRef.current = owner
  const mounted = useRef(false)
  const busyRef = useRef<symbol | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => { busyRef.current = null; setBusy(false); setMessage(''); setError('') }, [owner])

  const move = async (first: BeforeAfterPair, second: BeforeAfterPair, expectedOrderRevision: string | null, trigger: HTMLButtonElement) => {
    if (busyRef.current || !isWorkGalleryRevision(expectedOrderRevision) || !isWorkGalleryRevision(first.revision) || !isWorkGalleryRevision(second.revision)) return
    const current = () => mounted.current && ownerRef.current === owner && useAuthStore.getState().sessionVersion === sessionVersion
    const request = Symbol('reorder')
    busyRef.current = request
    setBusy(true); setMessage(''); setError('')
    try {
      await api.patch(`/api/services/admin/work-gallery/${encodeURIComponent(serviceId)}/order`, {
        firstId: first.id, secondId: second.id, firstRevision: first.revision, secondRevision: second.revision, expectedOrderRevision,
      })
      if (!current()) return
      if (document.activeElement === trigger) headingRef.current?.focus()
      setMessage(t('admin.serviceWorkGallery.orderUpdated'))
      onChanged()
    } catch {
      if (current()) setError(t('admin.serviceWorkGallery.orderFailed'))
    } finally {
      if (busyRef.current === request) {
        busyRef.current = null
        if (current()) setBusy(false)
      }
    }
  }

  return { move, busy, message, error }
}
