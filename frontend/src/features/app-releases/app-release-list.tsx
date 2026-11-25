import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { Loader2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { statusVariant, type AppRelease, type ReleaseStatus } from './app-release-types'

/**
 * Lista objavljenih verzija aplikacije (S9).
 *
 * Markup prenesen iz `pages/AppReleases.tsx` bez promjene: iste `Badge`
 * oznake (status + „force update“), isti prikaz minimalne podržane verzije i
 * veličine APK-a (isti `formatLocalizedNumber` sa 1 decimalkom) i isto dugme
 * „objavi“.
 */
export function AppReleaseList({
  rows,
  loading,
  saving,
  onPublish,
}: {
  rows: AppRelease[]
  loading: boolean
  saving: boolean
  onPublish: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const statusLabels: Record<ReleaseStatus, string> = {
    DRAFT: t('appReleases.status.draft'),
    PUBLISHED: t('appReleases.status.published'),
    RETIRED: t('appReleases.status.retired'),
  }

  return (
    <Card className="overflow-hidden">
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-content-muted" />
        </div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-content-muted">{t('appReleases.empty')}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {r.version} ({r.versionCode})
                  </span>
                  <Badge variant={statusVariant(r.status)}>{statusLabels[r.status]}</Badge>
                  {r.forceUpdate ? (
                    <Badge variant="danger">{t('appReleases.forceUpdate')}</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-content-muted">
                  {t('appReleases.minSupportedValue', {
                    versionCode: r.minSupportedVersionCode,
                    size: formatLocalizedNumber(r.apkSizeBytes / (1024 * 1024), language, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                  })}
                </p>
                {r.releaseNotes ? (
                  <p className="text-sm text-content-muted">{r.releaseNotes}</p>
                ) : null}
              </div>
              {r.status !== 'PUBLISHED' ? (
                <Button type="button" size="sm" disabled={saving} onClick={() => onPublish(r.id)}>
                  {t('appReleases.publish')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
