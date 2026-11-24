import { useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useServiceWorkGallery } from '../features/services/use-service-work-gallery'
import { WorkGalleryVisibility } from '../features/services/work-gallery-visibility'
import { useAuthStore } from '../stores/auth.store'
import { getUploadUrl } from '../utils/uploadUrl'
import { BeforeAfterSlider } from '../components/BeforeAfterSlider'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export default function ServiceWorkGallery() {
  const { t, i18n } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const resultsRef = useRef<HTMLParagraphElement>(null)
  const [moreFocused, setMoreFocused] = useState(false)
  const { serviceId } = useParams()
  const id = useMemo(() => (serviceId ?? '').trim(), [serviceId])
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const canManage = useAuthStore(state => state.user?.roles.some(role => role === 'SYSTEM_ADMIN' || role === 'OWNER') ?? false)

  const { service, loadingService, serviceLoadError, items, pairsLoadError, loadingPairs, loadingMore, hasMore, offset, sentinelRef, loadService, loadPage, reloadPairs } = useServiceWorkGallery(id)


  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-content">
            {t('admin.serviceWorkGallery.title')}
          </h1>
          {!loadingService ? <p className="mt-1 text-sm text-content-strong ">
            {service ? service.name : t('admin.serviceWorkGallery.serviceFallback')}
          </p> : null}
          {!loadingService && service ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {new Intl.NumberFormat(i18n.language).format(service.durationMinutes)}{' '}
                {t('admin.serviceWorkGallery.minutesAbbreviation')}
              </Badge>
            </div>
          ) : null}
        </div>

        {!loadingService ? <Button asChild type="button" variant="outline">
          <RouterLink to="/admin/services">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('admin.serviceWorkGallery.back')}
          </RouterLink>
        </Button> : null}
      </div>

      {loadingService ? (
        <div role="status" className="flex justify-center py-14 text-content-strong">
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span className="sr-only">{t('admin.serviceWorkGallery.loadingService')}</span>
        </div>
      ) : <>
      {serviceLoadError ? (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
          role="alert"
        >
          <p className="text-sm text-amber-900">
            {t('admin.serviceWorkGallery.serviceLoadFailed')}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => { headingRef.current?.focus(); void loadService() }}>
            {t('admin.serviceWorkGallery.retry')}
          </Button>
        </div>
      ) : null}

      {loadingPairs && items.length === 0 ? (
        <div role="status" className="flex justify-center py-14 text-content-strong">
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span className="sr-only">{t('admin.serviceWorkGallery.loadingPairs')}</span>
        </div>
      ) : (
        <>
          <WorkGalleryVisibility key={`${sessionVersion}:${id}`} serviceId={id} sessionVersion={sessionVersion} enabled={canManage && Boolean(service)} headingRef={headingRef} onChanged={reloadPairs}>
            {(hide, busy) => items.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((pair, index) => (
                <Card key={pair.id} className="overflow-hidden">
                  <BeforeAfterSlider
                    ariaLabel={items.length > 1
                      ? t('public.beforeAfter.sliderLabelIndexed', { current: index + 1, total: items.length })
                      : t('public.beforeAfter.sliderLabel')}
                    beforeSrc={getUploadUrl(
                      pair.before.pathMedium ?? pair.before.pathThumb ?? pair.before.pathOriginal,
                    )}
                    afterSrc={getUploadUrl(
                      pair.after.pathMedium ?? pair.after.pathThumb ?? pair.after.pathOriginal,
                    )}
                    alt={t('public.beforeAfter.comparisonLabels')}
                    aspectRatio={1}
                  />
                  {canManage && service ? <div className="p-3"><Button type="button" variant="outline" aria-disabled={busy} onClick={event => { if (!busy) hide(pair.id, event.currentTarget) }}>
                    {t('admin.serviceWorkGallery.hidePair', { current: index + 1 })}
                  </Button></div> : null}
                </Card>
              ))}
            </div>
          ) : !hasMore && !pairsLoadError && !loadingMore ? (
            <p className="py-10 text-center text-sm text-content-strong">{t('admin.serviceWorkGallery.empty')}</p>
          ) : null}
          </WorkGalleryVisibility>
          {items.length > 0 || hasMore || offset > 0 ? (
            <p ref={resultsRef} tabIndex={-1} className="mt-4 text-sm text-content-strong">{t('admin.serviceWorkGallery.loadedCount', { count: items.length })}</p>
          ) : null}
          <div ref={sentinelRef} className="h-4 mt-8" />
          {hasMore || moreFocused ? (
            <Button type="button" variant="outline" aria-disabled={loadingMore || !hasMore} onFocus={() => setMoreFocused(true)} onBlur={() => setMoreFocused(false)}
              onClick={() => { if (!hasMore || loadingMore) return; resultsRef.current?.focus(); void loadPage(offset, true) }}>
              {t('admin.serviceWorkGallery.loadMore')}
            </Button>
          ) : null}
          {pairsLoadError ? (
            <div className="py-4 text-center" role="alert">
              <p className="text-sm text-content-strong">{t('admin.serviceWorkGallery.pairsLoadFailed')}</p>
              <Button variant="outline" className="mt-3" onClick={() => { (resultsRef.current ?? headingRef.current)?.focus(); void loadPage(offset, offset > 0) }}>
                {t('admin.serviceWorkGallery.retry')}
              </Button>
            </div>
          ) : null}
          {loadingMore ? (
            <div role="status" aria-live="polite" className="flex justify-center py-8 text-content-strong">
              <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span className="sr-only">{t('admin.serviceWorkGallery.loadingPairs')}</span>
            </div>
          ) : null}
        </>
      )}
      </>}
    </div>
  )
}
