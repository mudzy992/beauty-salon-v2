import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppToast } from '../../../lib/toast/useAppToast'
import {
  attachDailyLogImage,
  completeDailyLogEntry,
  proposeReschedule,
  uploadDailyLogImage,
} from '../api/stylist-workbook.api'
import type { DailyLogEntry } from '../types'

/**
 * Akcije na detalju dnevnika knjige (S10).
 *
 * Izdvojeno iz `pages/workbook-detail-page.tsx` **bez promjene ponašanja**:
 * upload „prije/poslije" slika (sa održavanjem fokusa), završetak unosa i
 * ponuda za promjenu termina nakon kašnjenja.
 *
 * Sve poruke, toastovi i redoslijed koraka ostaju **identični** ranijem
 * monolitnom fajlu — razlika je samo u tome gdje se nalaze.
 */
export const useWorkbookDetailActions = ({
  entry,
  refetch,
  onReschedulePreview,
}: {
  entry: DailyLogEntry | null
  refetch: () => Promise<unknown>
  /** Otvara preview promjene termina (preko navigacije stranice). */
  onReschedulePreview: (reservationId: string, includeBreaks: boolean) => void
}) => {
  const { t } = useTranslation()
  const { toastApiError, success, warning } = useAppToast()

  const [acting, setActing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [beforeDescription, setBeforeDescription] = useState('')
  const [afterDescription, setAfterDescription] = useState('')
  const beforeFileRef = useRef<HTMLInputElement>(null)
  const afterFileRef = useRef<HTMLInputElement>(null)
  const beforeButtonRef = useRef<HTMLButtonElement>(null)
  const afterButtonRef = useRef<HTMLButtonElement>(null)
  const focusAfterUpload = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (uploading || !focusAfterUpload.current) return
    const trigger = focusAfterUpload.current
    focusAfterUpload.current = null
    const active = document.activeElement
    // Disabling the trigger can drop focus to body. Do not override a user's later move.
    if (trigger.isConnected && (active === document.body || active === beforeFileRef.current || active === afterFileRef.current)) trigger.focus()
  }, [uploading])

  const [confirmOpen, setConfirmOpen] = useState(false)

  const [reschedulePromptOpen, setReschedulePromptOpen] = useState(false)
  const [rescheduleReservationId, setRescheduleReservationId] = useState<string | null>(null)
  const [rescheduleOverrunLabel, setRescheduleOverrunLabel] = useState<number>(0)

  const handleUpload = async (isBefore: boolean, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!entry) return
    const description = (isBefore ? beforeDescription : afterDescription).trim()
    if (description.length < 3) return
    const trigger = isBefore ? beforeButtonRef.current : afterButtonRef.current
    const active = document.activeElement
    if (active === trigger || active === e.target || active === document.body) focusAfterUpload.current = trigger
    setUploading(true)
    try {
      const upload = await uploadDailyLogImage(file)
      await attachDailyLogImage({
        entryId: entry.id,
        body: { uploadId: upload.id, isBefore, isAfter: !isBefore, description },
      })
      success(
        t('stylistWorkbook.detail.imageAddedTitle'),
        t('stylistWorkbook.detail.imageAddedMessage'),
      )
      await refetch()
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.detail.imageUploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleComplete = async () => {
    if (!entry) return
    setConfirmOpen(false)
    setActing(true)
    const reservationId = entry.reservationId ?? null
    try {
      await completeDailyLogEntry(entry.id)
      await refetch()

      if (!reservationId) {
        success(
          t('stylistWorkbook.detail.completedTitle'),
          t('stylistWorkbook.detail.completedMessage'),
        )
        return
      }

      try {
        const proposal = await proposeReschedule({
          reservationId,
          includeBreaks: false,
          mode: 'actual_overrun',
        })

        const delay = proposal?.delayMinutes ?? 0
        const itemCount = proposal?.items?.length ?? 0
        const overrunLabel = proposal?.overrunMinutes ?? delay

        if (delay > 0 && itemCount > 0) {
          setRescheduleReservationId(reservationId)
          setRescheduleOverrunLabel(overrunLabel)
          setReschedulePromptOpen(true)
          return
        }

        if (delay > 0 && itemCount === 0) {
          warning(
            t('stylistWorkbook.detail.latenessTitle'),
            t('stylistWorkbook.detail.noRescheduleNeeded', { minutes: overrunLabel }),
          )
        }
      } catch {
        // optional step: ignore errors (matches mobile)
      }
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.detail.actionFailed'))
    } finally {
      setActing(false)
    }
  }

  return {
    acting,
    uploading,
    beforeDescription,
    setBeforeDescription,
    afterDescription,
    setAfterDescription,
    beforeFileRef,
    afterFileRef,
    beforeButtonRef,
    afterButtonRef,
    handleUpload,
    confirmOpen,
    setConfirmOpen,
    handleComplete,
    reschedulePromptOpen,
    setReschedulePromptOpen,
    rescheduleReservationId,
    rescheduleOverrunLabel,
    setRescheduleReservationId,
    setRescheduleOverrunLabel,
    onReschedulePreview,
  }
}
