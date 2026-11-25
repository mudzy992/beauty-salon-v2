import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Label } from '../../components/ui/label'
import { useWorkGalleryRecords } from './use-work-gallery-records'
import { useWorkGalleryUpload } from './use-work-gallery-upload'
import { WORK_GALLERY_MAX_PHOTO_BYTES, WORK_GALLERY_PHOTO_MIMES } from './work-gallery-upload-types.mjs'

// 1.4.11: okvir <select> mora imati 3:1 prema podlozi; border-line
// (#E2E8F0) je 1.23:1. input-border -> --control-border = 4.24:1.
const selectClass = 'h-10 w-full rounded-md border border-input-border bg-surface px-2 text-sm text-content'

/**
 * Private before/after upload for a completed service record.
 *
 * The photos stay private: the client has to consent to every single photo in
 * the client app before the pair can appear in the gallery.
 */
export function WorkGalleryUpload({ serviceId, enabled, onUploaded }: {
  serviceId: string
  enabled: boolean
  onUploaded: () => void
}) {
  const { t, i18n } = useTranslation()
  const records = useWorkGalleryRecords({ serviceId, enabled })
  const upload = useWorkGalleryUpload({
    serviceId,
    enabled,
    selectedId: records.selectedId,
    reloadRecords: records.reload,
    onUploaded,
  })
  const [pendingOpen, setPendingOpen] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)
  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)

  if (!enabled) return null

  const handleSubmit = async () => {
    const outcome = await upload.submit()
    if (outcome === 'record-required') selectRef.current?.focus()
    else if (outcome === 'photo-required') (upload.beforeFile ? beforeRef : afterRef).current?.focus()
    else if (outcome === 'photo-invalid-before') beforeRef.current?.focus()
    else if (outcome === 'photo-invalid-after') afterRef.current?.focus()
    else if (outcome === 'failed') errorRef.current?.focus()
    else if (outcome === 'success') statusRef.current?.focus()
  }

  const formatDate = (value: string | null, fallback: string) =>
    value ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value)) : fallback

  return (
    <Card className="mt-6 p-4">
      <h2 className="text-lg font-semibold text-content">{t('admin.serviceWorkGallery.pairHeading')}</h2>
      <p id="work-gallery-pair-help" className="mt-1 text-sm text-content-strong">
        {t('admin.serviceWorkGallery.pairHelp')}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="work-gallery-pair-record">{t('admin.serviceWorkGallery.pairRecordLabel')}</Label>
          <select
            id="work-gallery-pair-record"
            ref={selectRef}
            className={selectClass}
            value={records.selectedId}
            aria-describedby="work-gallery-pair-help"
            disabled={upload.submitting || records.entriesLoading || records.entries.length === 0}
            onChange={event => records.setSelectedId(event.target.value)}
          >
            {records.entries.length === 0 ? (
              <option value="">{t('admin.serviceWorkGallery.pairRecordEmpty')}</option>
            ) : records.entries.map(entry => (
              <option key={entry.id} value={entry.id}>
                {t('admin.serviceWorkGallery.pairRecordOption', {
                  date: formatDate(entry.completedAt, entry.date),
                  client: entry.clientName,
                  reference: entry.reference,
                })}
              </option>
            ))}
          </select>
          {records.entriesLoading ? (
            <p role="status" className="text-sm text-content-strong">{t('admin.serviceWorkGallery.pairRecordsLoading')}</p>
          ) : null}
          {records.entriesHasMore ? (
            <Button
              type="button"
              variant="outline"
              className="mt-2 self-start"
              aria-disabled={records.entriesLoading}
              onClick={() => { void records.loadEntries(true) }}
            >
              {t('admin.serviceWorkGallery.pairRecordsMore')}
            </Button>
          ) : null}
          {records.entriesError ? (
            <div role="alert" className="text-sm text-content-strong">
              <p>{t('admin.serviceWorkGallery.pairRecordsFailed')}</p>
              <Button type="button" variant="outline" className="mt-2" onClick={() => { void records.loadEntries(false) }}>
                {t('admin.serviceWorkGallery.retry')}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="work-gallery-pair-before">{t('admin.serviceWorkGallery.pairBeforeLabel')}</Label>
            <input
              id="work-gallery-pair-before"
              ref={beforeRef}
              type="file"
              accept={WORK_GALLERY_PHOTO_MIMES.join(',')}
              aria-describedby="work-gallery-pair-help"
              aria-invalid={upload.beforeRejection ? true : undefined}
              disabled={upload.submitting}
              onChange={event => upload.selectPhoto('before', event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-input-border bg-surface px-3 py-2 text-sm text-content file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            {upload.beforeRejection ? (
              <p role="alert" className="text-sm text-content-strong">
                {upload.beforeRejection === 'size'
                  ? t('admin.serviceWorkGallery.pairPhotoTooLarge', { size: Math.round(WORK_GALLERY_MAX_PHOTO_BYTES / (1024 * 1024)) })
                  : t('admin.serviceWorkGallery.pairPhotoTypeInvalid')}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="work-gallery-pair-after">{t('admin.serviceWorkGallery.pairAfterLabel')}</Label>
            <input
              id="work-gallery-pair-after"
              ref={afterRef}
              type="file"
              accept={WORK_GALLERY_PHOTO_MIMES.join(',')}
              aria-describedby="work-gallery-pair-help"
              aria-invalid={upload.afterRejection ? true : undefined}
              disabled={upload.submitting}
              onChange={event => upload.selectPhoto('after', event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-input-border bg-surface px-3 py-2 text-sm text-content file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            {upload.afterRejection ? (
              <p role="alert" className="text-sm text-content-strong">
                {upload.afterRejection === 'size'
                  ? t('admin.serviceWorkGallery.pairPhotoTooLarge', { size: Math.round(WORK_GALLERY_MAX_PHOTO_BYTES / (1024 * 1024)) })
                  : t('admin.serviceWorkGallery.pairPhotoTypeInvalid')}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => { void handleSubmit() }}
          aria-disabled={upload.submitting || !records.selectedId || !upload.beforeFile || !upload.afterFile}
        >
          {upload.submitting
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : <Upload className="mr-2 h-4 w-4" aria-hidden="true" />}
          {t('admin.serviceWorkGallery.pairSubmit')}
        </Button>
        {upload.submitting ? (
          <span role="status" className="text-sm text-content-strong">{t('admin.serviceWorkGallery.pairUploading')}</span>
        ) : null}
      </div>

      {upload.submitError ? (
        <p ref={errorRef} tabIndex={-1} role="alert" className="mt-3 text-sm text-content-strong focus:outline-none">
          {upload.submitError}
        </p>
      ) : null}
      {upload.successMessage ? (
        <p ref={statusRef} tabIndex={-1} role="status" className="mt-3 text-sm text-content-strong focus:outline-none">
          {upload.successMessage}
        </p>
      ) : null}

      <details
        className="mt-6"
        open={pendingOpen}
        onToggle={event => {
          const open = event.currentTarget.open
          setPendingOpen(open)
          if (open) void records.loadPending()
        }}
      >
        <summary className="cursor-pointer text-content">{t('admin.serviceWorkGallery.pairPendingHeading')}</summary>
        {records.pendingLoading ? (
          <p role="status" className="mt-2 text-sm text-content-strong">{t('admin.serviceWorkGallery.pairPendingLoading')}</p>
        ) : null}
        {records.pendingError ? (
          <div role="alert" className="mt-2 text-sm text-content-strong">
            <p>{t('admin.serviceWorkGallery.pairPendingFailed')}</p>
            <Button type="button" variant="outline" className="mt-2" onClick={() => { void records.loadPending() }}>
              {t('admin.serviceWorkGallery.retry')}
            </Button>
          </div>
        ) : null}
        {records.pendingLoaded && !records.pendingLoading && !records.pendingError && records.pending.length === 0 ? (
          <p className="mt-2 text-sm text-content-strong">{t('admin.serviceWorkGallery.pairPendingEmpty')}</p>
        ) : null}
        <ul className="mt-2 space-y-2">
          {records.pending.map(pair => (
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
    </Card>
  )
}
