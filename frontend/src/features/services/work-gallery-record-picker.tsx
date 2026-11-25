import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'

// 1.4.11: okvir <select> mora imati 3:1 prema podlozi; border-line
// (#E2E8F0) je 1.23:1. input-border -> --control-border = 4.24:1.
const selectClass = 'h-10 w-full rounded-md border border-input-border bg-surface px-2 text-sm text-content'

export type EligibleRecord = {
  id: string
  completedAt: string | null
  date: string
  reference: string
  clientName: string
}

type Props = {
  entries: EligibleRecord[]
  selectedId: string
  loading: boolean
  hasMore: boolean
  error: boolean
  disabled: boolean
  selectRef: RefObject<HTMLSelectElement>
  formatDate: (value: string | null, fallback: string) => string
  onSelect: (id: string) => void
  onLoadMore: () => void
  onRetry: () => void
}

/**
 * Odabir završenog zapisa usluge za koji se uploadaju „prije/poslije" fotografije.
 *
 * Lista je dozvoljena samo za zapise koji već imaju završen status i klijenta;
 * učitavanje je s paginacijom („učitaj još").
 */
export function WorkGalleryRecordPicker({
  entries,
  selectedId,
  loading,
  hasMore,
  error,
  disabled,
  selectRef,
  formatDate,
  onSelect,
  onLoadMore,
  onRetry,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="work-gallery-pair-record">{t('admin.serviceWorkGallery.pairRecordLabel')}</Label>
      <select
        id="work-gallery-pair-record"
        ref={selectRef}
        className={selectClass}
        value={selectedId}
        aria-describedby="work-gallery-pair-help"
        disabled={disabled}
        onChange={event => onSelect(event.target.value)}
      >
        {entries.length === 0 ? (
          <option value="">{t('admin.serviceWorkGallery.pairRecordEmpty')}</option>
        ) : entries.map(entry => (
          <option key={entry.id} value={entry.id}>
            {t('admin.serviceWorkGallery.pairRecordOption', {
              date: formatDate(entry.completedAt, entry.date),
              client: entry.clientName,
              reference: entry.reference,
            })}
          </option>
        ))}
      </select>
      {loading ? (
        <p role="status" className="text-sm text-content-strong">{t('admin.serviceWorkGallery.pairRecordsLoading')}</p>
      ) : null}
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="mt-2 self-start"
          aria-disabled={loading}
          onClick={onLoadMore}
        >
          {t('admin.serviceWorkGallery.pairRecordsMore')}
        </Button>
      ) : null}
      {error ? (
        <div role="alert" className="text-sm text-content-strong">
          <p>{t('admin.serviceWorkGallery.pairRecordsFailed')}</p>
          <Button type="button" variant="outline" className="mt-2" onClick={onRetry}>
            {t('admin.serviceWorkGallery.retry')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
