import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'

export type PendingPair = {
  id: string
  completedAt: string | null
  date: string
  reference: string
  clientName: string
}

type Props = {
  open: boolean
  loading: boolean
  loaded: boolean
  error: boolean
  pending: PendingPair[]
  formatDate: (value: string | null, fallback: string) => string
  onToggle: (open: boolean) => void
  onRetry: () => void
}

/**
 * Popis parova koji čekaju odluku klijenta („saglasnost za svaku fotografiju").
 *
 * Popis se učitava tek kad se otvori, a u njemu nema putanja do privatnih
 * datoteka — samo podaci o zapisu i stanju saglasnosti.
 */
export function WorkGalleryPendingPairs({
  open,
  loading,
  loaded,
  error,
  pending,
  formatDate,
  onToggle,
  onRetry,
}: Props) {
  const { t } = useTranslation()

  return (
    <details
      className="mt-6"
      open={open}
      onToggle={event => onToggle(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-content">{t('admin.serviceWorkGallery.pairPendingHeading')}</summary>
      {loading ? (
        <p role="status" className="mt-2 text-sm text-content-strong">{t('admin.serviceWorkGallery.pairPendingLoading')}</p>
      ) : null}
      {error ? (
        <div role="alert" className="mt-2 text-sm text-content-strong">
          <p>{t('admin.serviceWorkGallery.pairPendingFailed')}</p>
          <Button type="button" variant="outline" className="mt-2" onClick={onRetry}>
            {t('admin.serviceWorkGallery.retry')}
          </Button>
        </div>
      ) : null}
      {loaded && !loading && !error && pending.length === 0 ? (
        <p className="mt-2 text-sm text-content-strong">{t('admin.serviceWorkGallery.pairPendingEmpty')}</p>
      ) : null}
      <ul className="mt-2 space-y-2">
        {pending.map(pair => (
          <li key={pair.id} className="text-sm text-content-strong">
            {t('admin.serviceWorkGallery.pairPendingEntry', {
              date: formatDate(pair.completedAt, pair.date),
              client: pair.clientName,
              reference: pair.reference,
            })}
            <span className="ml-2">{t('admin.serviceWorkGallery.pairPendingConsent')}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
