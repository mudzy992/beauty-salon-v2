import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useAppToast } from '../../../lib/toast/useAppToast'
import { commitReschedule, proposeReschedule } from '../api/stylist-workbook.api'
import type { RescheduleMode, RescheduleProposal } from '../types'

const clampNonNegInt = (v: number) => Math.max(0, Math.floor(v))

/**
 * Stanje i tok promjene termina (S10).
 *
 * Izdvojeno iz `pages/workbook-reschedule-preview-page.tsx` **bez promjene**:
 * isti parametri iz URL-a kao početne vrijednosti (3.3.7 — korisnik ne
 * odgovara na isto pitanje dvaput), isti redoslijed `proposeReschedule` →
 * `commitReschedule`, iste poruke i isti toastovi.
 */
export const useReschedulePreview = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const [searchParams] = useSearchParams()
  const { toastApiError, success } = useAppToast()

  const id = String(reservationId ?? '')

  const initialIncludeBreaks = useMemo(() => {
    const v = searchParams.get('includeBreaks')
    return v === '1' || v === 'true'
  }, [searchParams])

  const initialMode = useMemo<RescheduleMode>(() => {
    const v = searchParams.get('mode')
    if (v === 'manual_minutes' || v === 'use_break_only' || v === 'actual_overrun') return v
    return 'actual_overrun'
  }, [searchParams])

  const initialManualShiftMinutes = useMemo(() => {
    const v = searchParams.get('manualShiftMinutes')
    const n = clampNonNegInt(parseInt(v || '0', 10) || 0)
    return String(n || 5)
  }, [searchParams])

  const [includeBreaks, setIncludeBreaks] = useState(initialIncludeBreaks)
  const [mode, setMode] = useState<RescheduleMode>(initialMode)
  const [manualShiftMinutes, setManualShiftMinutes] = useState(initialManualShiftMinutes)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [proposal, setProposal] = useState<RescheduleProposal | null>(null)
  const [proposalLoadError, setProposalLoadError] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const fetchProposal = async () => {
    setLoading(true)
    setProposalLoadError(false)
    try {
      const data = await proposeReschedule({
        reservationId: id,
        includeBreaks,
        mode,
        manualShiftMinutes:
          mode === 'manual_minutes'
            ? clampNonNegInt(parseInt(manualShiftMinutes || '0', 10) || 0)
            : undefined,
      })
      setProposal(data)
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.reschedule.recalculationFailed'))
      setProposal(null)
      setProposalLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    void fetchProposal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const items = proposal?.items ?? []
  const hasChanges = items.length > 0 && (proposal?.delayMinutes ?? 0) > 0
  const totalShift = items.length ? items[items.length - 1]?.shiftMinutes ?? 0 : 0

  const handleCommit = async () => {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      await commitReschedule({
        reservationId: id,
        includeBreaks,
        mode,
        manualShiftMinutes:
          mode === 'manual_minutes'
            ? clampNonNegInt(parseInt(manualShiftMinutes || '0', 10) || 0)
            : undefined,
      })
      success(
        t('stylistWorkbook.reschedule.sentTitle'),
        mode === 'use_break_only'
          ? t('stylistWorkbook.reschedule.breakOnlyApplied')
          : t('stylistWorkbook.reschedule.clientsNotified'),
      )
      navigate(-1)
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.reschedule.notifyFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    includeBreaks,
    setIncludeBreaks,
    mode,
    setMode,
    manualShiftMinutes,
    setManualShiftMinutes,
    loading,
    submitting,
    proposal,
    proposalLoadError,
    confirmOpen,
    setConfirmOpen,
    items,
    hasChanges,
    totalShift,
    fetchProposal,
    handleCommit,
  }
}
