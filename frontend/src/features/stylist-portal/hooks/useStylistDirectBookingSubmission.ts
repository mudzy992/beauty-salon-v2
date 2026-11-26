import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import api from '../../../api/client'
import { getErrorMessage, getErrorCode } from '../../../api/error'
import { resolveAdminApiError } from '../../admin/admin-api-error.mjs'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { useAuthStore } from '../../../stores/auth.store'
import type { DirectBookingClient } from '../direct-booking.types'

/** Submit path retains session-change and duplicate-submit guards. */
export const useStylistDirectBookingSubmission = ({
  selectedClient,
  serviceIds,
  reservationDate,
  startTime,
  endTime,
  clientNotes,
}: {
  selectedClient: DirectBookingClient | null
  serviceIds: string[]
  reservationDate: string
  startTime: string
  endTime: string
  clientNotes: string
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useAppToast()
  const [saving, setSaving] = useState(false)
  const submitGeneration = useRef(0)
  const submitInFlight = useRef(false)

  useEffect(() => () => {
    submitGeneration.current += 1
    submitInFlight.current = false
  }, [])

  const handleSubmit = async () => {
    if (submitInFlight.current) return
    if (!selectedClient?.gender) {
      toast.error(t('stylistPortal.directBooking.clientGenderRequired'))
      return
    }
    const generation = ++submitGeneration.current
    const sessionVersion = useAuthStore.getState().sessionVersion
    const isCurrent = () => generation === submitGeneration.current && useAuthStore.getState().sessionVersion === sessionVersion
    submitInFlight.current = true
    setSaving(true)
    try {
      await api.post('/api/reservations/stylist/direct', {
        clientId: selectedClient.id,
        serviceIds,
        reservationDate,
        startTime,
        endTime,
        clientNotes: clientNotes.trim() || undefined,
      })
      if (!isCurrent()) return
      toast.success(t('stylistPortal.directBooking.created'))
      navigate('/stylist/schedule')
    } catch (error) {
      if (!isCurrent()) return
      const apiErr = resolveAdminApiError(getErrorMessage(error, ''), 'stylistPortal.directBooking.createFailed', getErrorCode(error))
      toast.error(t(apiErr.key, apiErr.values))
    } finally {
      if (generation === submitGeneration.current) {
        submitInFlight.current = false
        setSaving(false)
      }
    }
  }

  return { saving, handleSubmit }
}
