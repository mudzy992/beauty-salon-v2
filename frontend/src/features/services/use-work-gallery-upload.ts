import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getErrorCode, getErrorMessage } from '../../api/error'
import { useAuthStore } from '../../stores/auth.store'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { checkPhoto } from './work-gallery-upload-types.mjs'
import { useWorkGalleryPhotos } from './use-work-gallery-photos'
import { uploadWorkGalleryPair } from './work-gallery-upload-request'

export type SubmitOutcome =
  | 'success'
  | 'record-required'
  | 'photo-required'
  | 'photo-invalid-before'
  | 'photo-invalid-after'
  | 'failed'
  | 'ignored'

type Params = {
  serviceId: string
  enabled: boolean
  selectedId: string
  reloadRecords: () => void
  onUploaded: () => void
}

/**
 * Sends one private before/after pair for a completed service record.
 *
 * The request never publishes the photos and never creates consent; the client
 * decides per photo in the client app. Every response of an older session is
 * dropped instead of being written into the current one.
 */
export function useWorkGalleryUpload({ serviceId, enabled, selectedId, reloadRecords, onUploaded }: Params) {
  const { t } = useTranslation()
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const owner = JSON.stringify([sessionVersion, serviceId, enabled])
  const ownerRef = useRef(owner)
  ownerRef.current = owner

  const submitSequence = useRef(0)
  const submitInFlight = useRef(false)

  const {
    beforeFile,
    afterFile,
    beforeRejection,
    afterRejection,
    setBeforeRejection,
    setAfterRejection,
    selectPhoto: selectPhotoFile,
    clear: clearPhotos,
  } = useWorkGalleryPhotos()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectPhoto = useCallback((side: 'before' | 'after', file: File | null) => {
    selectPhotoFile(side, file)
    setSubmitError('')
    setSuccessMessage('')
  }, [selectPhotoFile])

  const reset = useCallback(() => {
    submitSequence.current += 1
    submitInFlight.current = false
    clearPhotos()
    setSubmitting(false)
    setSubmitError('')
    setSuccessMessage('')
  }, [clearPhotos])

  useEffect(() => {
    if (enabled && serviceId) return
    reset()
  }, [enabled, serviceId, reset])

  const submit = useCallback(async (): Promise<SubmitOutcome> => {
    if (!serviceId || !enabled || submitInFlight.current) return 'ignored'
    if (!selectedId) {
      setSubmitError(t('admin.serviceWorkGallery.pairRecordRequired'))
      return 'record-required'
    }
    if (!beforeFile || !afterFile) {
      setSubmitError(t('admin.serviceWorkGallery.pairPhotosRequired'))
      return 'photo-required'
    }
    const beforeCheck = checkPhoto(beforeFile)
    const afterCheck = checkPhoto(afterFile)
    setBeforeRejection(beforeCheck)
    setAfterRejection(afterCheck)
    if (beforeCheck) {
      setSubmitError(t('admin.serviceWorkGallery.pairPhotoTypeInvalid'))
      return 'photo-invalid-before'
    }
    if (afterCheck) {
      setSubmitError(t('admin.serviceWorkGallery.pairPhotoTypeInvalid'))
      return 'photo-invalid-after'
    }
    const request = ++submitSequence.current
    submitInFlight.current = true
    setSubmitting(true)
    setSubmitError('')
    setSuccessMessage('')
    const isCurrent = () =>
      ownerRef.current === owner &&
      useAuthStore.getState().sessionVersion === sessionVersion &&
      submitSequence.current === request
    try {
      await uploadWorkGalleryPair(serviceId, selectedId, beforeFile, afterFile)
      if (!isCurrent()) return 'ignored'
      clearPhotos()
      setSuccessMessage(t('admin.serviceWorkGallery.pairUploaded'))
      onUploaded()
      reloadRecords()
      return 'success'
    } catch (err) {
      if (!isCurrent()) return 'ignored'
      setSubmitError(t(resolveAdminApiErrorKey(
        getErrorMessage(err, ''),
        'admin.serviceWorkGallery.pairUploadFailed',
        getErrorCode(err),
      )))
      return 'failed'
    } finally {
      if (isCurrent()) setSubmitting(false)
      submitInFlight.current = false
    }
  }, [serviceId, enabled, selectedId, reloadRecords, beforeFile, afterFile, onUploaded, t, owner, sessionVersion, clearPhotos, setBeforeRejection, setAfterRejection])

  return {
    beforeFile,
    afterFile,
    beforeRejection,
    afterRejection,
    submitting,
    submitError,
    successMessage,
    selectPhoto,
    submit,
  }
}
