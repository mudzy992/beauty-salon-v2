import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { useWorkGalleryRecords } from './use-work-gallery-records'
import { useWorkGalleryUpload } from './use-work-gallery-upload'
import { WorkGalleryPhotoField } from './work-gallery-photo-fields'
import { WorkGalleryPendingPairs } from './work-gallery-pending-pairs'
import { WorkGalleryRecordPicker } from './work-gallery-record-picker'

/**
 * Private before/after upload for a completed service record.
 *
 * The photos stay private: the client has to consent to every single photo in
 * the client app before the pair can appear in the gallery.
 *
 * The form is split into three parts (record picker, photo fields, pending
 * list) so each file stays readable; this component only orchestrates them.
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
        <WorkGalleryRecordPicker
          entries={records.entries}
          selectedId={records.selectedId}
          loading={records.entriesLoading}
          hasMore={records.entriesHasMore}
          error={Boolean(records.entriesError)}
          disabled={upload.submitting || records.entriesLoading || records.entries.length === 0}
          selectRef={selectRef}
          formatDate={formatDate}
          onSelect={records.setSelectedId}
          onLoadMore={() => { void records.loadEntries(true) }}
          onRetry={() => { void records.loadEntries(false) }}
        />

        <div className="flex flex-col gap-3">
          <WorkGalleryPhotoField
            side="before"
            label={t('admin.serviceWorkGallery.pairBeforeLabel')}
            rejection={upload.beforeRejection}
            disabled={upload.submitting}
            inputRef={beforeRef}
            onSelect={file => upload.selectPhoto('before', file)}
          />
          <WorkGalleryPhotoField
            side="after"
            label={t('admin.serviceWorkGallery.pairAfterLabel')}
            rejection={upload.afterRejection}
            disabled={upload.submitting}
            inputRef={afterRef}
            onSelect={file => upload.selectPhoto('after', file)}
          />
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

      <WorkGalleryPendingPairs
        open={pendingOpen}
        loading={records.pendingLoading}
        loaded={records.pendingLoaded}
        error={Boolean(records.pendingError)}
        pending={records.pending}
        formatDate={formatDate}
        onToggle={open => {
          setPendingOpen(open)
          if (open) void records.loadPending()
        }}
        onRetry={() => { void records.loadPending() }}
      />
    </Card>
  )
}
