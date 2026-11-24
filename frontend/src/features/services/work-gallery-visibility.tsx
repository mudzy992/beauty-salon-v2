import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../../components/ui/button'
import { AdminConfirmDialog, type AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'

type HiddenEntry = { id: string; completedAt: string | null }
type HiddenPage = { items: HiddenEntry[]; hasMore: boolean; nextOffset: number }

/** Gallery-only visibility; original images and client consent are not changed. */
export function WorkGalleryVisibility({ serviceId, sessionVersion, enabled, headingRef, onChanged, children }: {
  serviceId: string
  sessionVersion: number
  enabled: boolean
  headingRef: { current: HTMLElement | null }
  onChanged: () => void
  children: (hide: (id: string, trigger: HTMLButtonElement) => void, busy: boolean) => ReactNode
}) {
  const { t, i18n } = useTranslation()
  const [request, setRequest] = useState<AdminConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(false)
  const sequence = useRef(0)
  const lastHiddenRequest = useRef({ offset: 0, append: false })
  const [error, setError] = useState('')
  const [opened, setOpened] = useState(false)
  const summaryRef = useRef<HTMLElement>(null)
  const [loading, setLoading] = useState(false)
  const [hidden, setHidden] = useState<HiddenEntry[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [listError, setListError] = useState(false)
  const base = `/api/services/admin/work-gallery/${encodeURIComponent(serviceId)}`
  const isCurrent = () => mounted.current && useAuthStore.getState().sessionVersion === sessionVersion

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; sequence.current += 1 }
  }, [])

  const loadHidden = useCallback(async (nextOffset: number, append: boolean) => {
    const currentRequest = ++sequence.current
    lastHiddenRequest.current = { offset: nextOffset, append }
    const current = () => mounted.current && useAuthStore.getState().sessionVersion === sessionVersion && sequence.current === currentRequest
    setLoading(true)
    setListError(false)
    try {
      const { data } = await api.get<HiddenPage>(`${base}/hidden`, { params: { offset: nextOffset, limit: 20 } })
      if (!current()) return
      if (!data || !Array.isArray(data.items) || typeof data.hasMore !== 'boolean' || !Number.isSafeInteger(data.nextOffset) || data.nextOffset < nextOffset ||
        (data.hasMore && data.nextOffset <= nextOffset) || data.items.some(item => !item || typeof item.id !== 'string' || !item.id || (item.completedAt !== null && (typeof item.completedAt !== 'string' || !Number.isFinite(Date.parse(item.completedAt)))))) throw new Error('Invalid hidden gallery page')
      setHidden(previous => append ? [...previous, ...data.items] : data.items)
      setOffset(data.nextOffset)
      setHasMore(data.hasMore)
    } catch {
      if (current()) setListError(true)
    } finally {
      if (current()) setLoading(false)
    }
  }, [base, sessionVersion])

  const change = (entryId: string, hide: boolean, trigger: HTMLButtonElement) => {
    if (busyRef.current) return
    setRequest({
      title: t(hide ? 'admin.serviceWorkGallery.hideTitle' : 'admin.serviceWorkGallery.restoreTitle'),
      description: t(hide ? 'admin.serviceWorkGallery.hideDescription' : 'admin.serviceWorkGallery.restoreDescription'),
      confirmLabel: t(hide ? 'admin.serviceWorkGallery.hideConfirm' : 'admin.serviceWorkGallery.restoreConfirm'),
      isDestructive: hide,
      trigger,
      action: async () => {
        if (busyRef.current || !isCurrent()) return
        busyRef.current = true
        setBusy(true)
        setError('')
        try {
          await api.patch(`${base}/entries/${encodeURIComponent(entryId)}/visibility`, { hidden: hide, expectedHidden: !hide })
          if (!isCurrent()) return
          // Do not pull focus back if the user moved elsewhere while the request ran.
          if (document.activeElement === trigger) headingRef.current?.focus()
          onChanged()
          if (opened) void loadHidden(0, false)
        } catch {
          if (isCurrent()) setError(t('admin.serviceWorkGallery.visibilityFailed'))
        } finally {
          if (isCurrent()) setBusy(false)
          busyRef.current = false
        }
      },
    })
  }

  return (
    <>
      {error ? <p role="alert" className="my-3 text-sm text-content-strong">{error}</p> : null}
      {children((id, trigger) => change(id, true, trigger), busy)}
      {enabled ? <details className="mt-6" onToggle={event => {
        const open = event.currentTarget.open
        setOpened(open)
        if (open) void loadHidden(0, false)
      }}>
        <summary ref={summaryRef} className="cursor-pointer text-content">{t('admin.serviceWorkGallery.hiddenHeading')}</summary>
        {loading ? <p role="status">{t('admin.serviceWorkGallery.hiddenLoading')}</p> : null}
        {listError ? <div role="alert"><p>{t('admin.serviceWorkGallery.hiddenFailed')}</p><Button type="button" variant="outline" onClick={() => { summaryRef.current?.focus(); void loadHidden(lastHiddenRequest.current.offset, lastHiddenRequest.current.append) }}>{t('admin.serviceWorkGallery.retry')}</Button></div> : null}
        {!loading && !listError && hidden.length === 0 ? <p>{t('admin.serviceWorkGallery.hiddenEmpty')}</p> : null}
        <ul className="space-y-3 py-3">
          {hidden.map(item => (
            <li key={item.id} className="flex flex-wrap items-center gap-3">
              <span>{t('admin.serviceWorkGallery.hiddenEntry', { date: item.completedAt ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(item.completedAt)) : t('admin.serviceWorkGallery.unknownDate'), id: item.id })}</span>
              <Button type="button" variant="outline" aria-disabled={busy} onClick={event => { if (!busyRef.current) change(item.id, false, event.currentTarget) }}>
                {t('admin.serviceWorkGallery.restorePair', { id: item.id })}
              </Button>
            </li>
          ))}
        </ul>
        {hasMore && !listError ? <Button type="button" variant="outline" aria-disabled={loading} onClick={() => { if (!loading) { summaryRef.current?.focus(); void loadHidden(offset, true) } }}>{t('admin.serviceWorkGallery.loadMoreHidden')}</Button> : null}
      </details> : null}
      <AdminConfirmDialog request={request} onClose={() => setRequest(null)} fallbackFocusRef={headingRef} shouldBlock={() => busyRef.current} />
    </>
  )
}
