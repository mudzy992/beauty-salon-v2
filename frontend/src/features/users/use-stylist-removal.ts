import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { getErrorCode } from '../../api/error'
import { fetchAllAdminStylists } from '../../api/catalog'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { UserRow, StylistRemovalPreview, StylistOption } from './user-types'

type RemovalMode = 'DELETE' | 'TRANSFER'
type Dependencies = { admins: UserRow[]; stylists: UserRow[]; clients: UserRow[]; loadData: () => void; showApiError: (err: unknown, fallbackKey: string) => void }
export function useStylistRemoval({ admins, stylists, clients, loadData, showApiError }: Dependencies) {
  const { t } = useTranslation()
  const { success, warning } = useAppToast()
  const removalTriggerRef = useRef<HTMLButtonElement | null>(null)
  const removalPreviewSequence = useRef(0)
  const [removeStylistOpen, setRemoveStylistOpen] = useState(false)
  const [removeStylistUser, setRemoveStylistUser] = useState<UserRow | null>(null)
  const [removalPreview, setRemovalPreview] = useState<StylistRemovalPreview | null>(null)
  const [allStylists, setAllStylists] = useState<StylistOption[]>([])
  const [removalSubmitting, setRemovalSubmitting] = useState(false)
  const [financialTarget, setFinancialTarget] = useState('')
  const [financialConfirmed, setFinancialConfirmed] = useState(false)

  const [removalModes, setRemovalModes] = useState<{
    dailyLogs: RemovalMode
    confirmedReservations: RemovalMode
    reservationResponses: RemovalMode
    reviews: RemovalMode
  }>({
    dailyLogs: 'TRANSFER',
    confirmedReservations: 'TRANSFER',
    reservationResponses: 'TRANSFER',
    reviews: 'TRANSFER',
  })

  const [removalTargets, setRemovalTargets] = useState<{
    dailyLogs?: string
    confirmedReservations?: string
    reservationResponses?: string
    reviews?: string
  }>({})

  const getTargetOptions = () => {
    const currentStylistId = removalPreview?.stylistProfileId
    return allStylists
      .filter((s) => typeof s.id === 'string' && s.id.trim() !== '' && s.id !== currentStylistId && ['ACTIVE', 'PENDING'].includes(String(s.status ?? '').toUpperCase()))
      .map((s) => ({
        id: s.id,
        label: [s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || s.user?.username || s.id,
        isPending: String(s.status ?? '').toUpperCase() !== 'ACTIVE' || s.isActive !== true || s.user?.isActive !== true,
      }))
  }

  const removalSummary = useMemo(() => {
    if (!removalPreview) return []
    const c = removalPreview.counts
    const rows = [
      { key: 'dailyLogs', label: t('users.stylistRemoval.categories.dailyLogs'), count: c.dailyLogEntriesCount },
      { key: 'confirmedReservations', label: t('users.stylistRemoval.categories.confirmedReservations'), count: c.confirmedReservationsCount },
      { key: 'reservationResponses', label: t('users.stylistRemoval.categories.reservationResponses'), count: c.reservationResponsesCount },
      { key: 'reviews', label: t('users.stylistRemoval.categories.reviews'), count: c.reviewsCount },
    ] as const
    return rows
      .filter((r) => (r.count ?? 0) > 0)
      .map((r) => {
        const mode = removalModes[r.key]
        const target = (removalTargets as any)[r.key] as string | undefined
        return { key: r.key, label: r.label, count: r.count, mode, target }
      })
  }, [removalPreview, removalModes, removalTargets, t])

  const isRemovalReady = useMemo(() => {
    if (!removalPreview) return false
    const financial = removalPreview.financial
    if ((financial.clientDebtsCount > 0 || financial.manualIncomeCount > 0) && (!financialTarget || !financialConfirmed)) return false
    if (financial.bookedDailyLogsCount > 0 && removalModes.dailyLogs === 'DELETE') return false
    for (const row of removalSummary) {
      if (row.mode === 'TRANSFER' && !row.target) return false
    }
    return true
  }, [removalPreview, removalSummary, removalModes.dailyLogs, financialTarget, financialConfirmed])

  const openRemoveStylist = async (userId: string) => {
    const sequence = ++removalPreviewSequence.current
    const u = [...admins, ...stylists, ...clients].find((x) => x.id === userId) ?? null
    setRemoveStylistUser(u)
    setRemovalPreview(null)
    setAllStylists([])
    setRemovalModes({
      dailyLogs: 'TRANSFER',
      confirmedReservations: 'TRANSFER',
      reservationResponses: 'TRANSFER',
      reviews: 'TRANSFER',
    })
    setRemovalTargets({})
    setFinancialTarget('')
    setFinancialConfirmed(false)
    setRemoveStylistOpen(true)

    try {
      const previewRes = await api.get<StylistRemovalPreview>(`/api/users/${userId}/stylist-removal-preview`)
      if (sequence !== removalPreviewSequence.current) return
      const preview = previewRes.data
      if (!preview || typeof preview.stylistProfileId !== 'string' ||
          typeof preview.revision !== 'string' || !/^[a-f0-9]{64}$/.test(preview.revision) ||
          !preview.counts || !preview.financial || [preview.counts.dailyLogEntriesCount, preview.counts.confirmedReservationsCount,
            preview.counts.reservationResponsesCount, preview.counts.reviewsCount, preview.financial.clientDebtsCount,
            preview.financial.manualIncomeCount, preview.financial.bookedDailyLogsCount].some(value => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('Invalid stylist removal preview')
      }
      if (preview.financial.bookedDailyLogsCount > preview.counts.dailyLogEntriesCount) {
        throw new Error('Inconsistent stylist removal preview')
      }
      const c = preview.counts
      const hasAnyLinks =
        (c.dailyLogEntriesCount ?? 0) > 0 ||
        (c.confirmedReservationsCount ?? 0) > 0 ||
        (c.reservationResponsesCount ?? 0) > 0 ||
        (c.reviewsCount ?? 0) > 0 ||
        preview.financial.clientDebtsCount > 0 || preview.financial.manualIncomeCount > 0
      // Even with no linked records, role removal must be explicitly confirmed.
      if (!hasAnyLinks) {
        setRemovalPreview(preview)
        return
      }

      const items = await fetchAllAdminStylists<StylistOption>()
      if (sequence !== removalPreviewSequence.current) return
      setAllStylists(items)
      setRemovalPreview(preview)
    } catch (err) {
      if (sequence !== removalPreviewSequence.current) return
      showApiError(err, 'users.errors.prepareStylistRemovalFailed')
      setRemovalSubmitting(false)
      setRemoveStylistOpen(false)
    }
  }

  const handleConfirmRemoveStylist = async () => {
    if (!removeStylistUser || !removalPreview) return
    const counts = removalPreview.counts
    const payload = {
      previewRevision: removalPreview.revision,
      financialTargetStylistProfileId: financialTarget || undefined,
      confirmFinancialTransfer: financialConfirmed,
      dailyLogs: {
        mode: counts.dailyLogEntriesCount > 0 ? removalModes.dailyLogs : 'DELETE',
        targetStylistProfileId: removalModes.dailyLogs === 'TRANSFER' ? removalTargets.dailyLogs : undefined,
      },
      confirmedReservations: {
        mode: counts.confirmedReservationsCount > 0 ? removalModes.confirmedReservations : 'DELETE',
        targetStylistProfileId:
          removalModes.confirmedReservations === 'TRANSFER' ? removalTargets.confirmedReservations : undefined,
      },
      reservationResponses: {
        mode: counts.reservationResponsesCount > 0 ? removalModes.reservationResponses : 'DELETE',
        targetStylistProfileId:
          removalModes.reservationResponses === 'TRANSFER' ? removalTargets.reservationResponses : undefined,
      },
      reviews: {
        mode: counts.reviewsCount > 0 ? removalModes.reviews : 'DELETE',
        targetStylistProfileId: removalModes.reviews === 'TRANSFER' ? removalTargets.reviews : undefined,
      },
    } as const

    const missingTarget = (key: 'dailyLogs' | 'confirmedReservations' | 'reservationResponses' | 'reviews') =>
      payload[key].mode === 'TRANSFER' && !payload[key].targetStylistProfileId

    if (
      missingTarget('dailyLogs') ||
      missingTarget('confirmedReservations') ||
      missingTarget('reservationResponses') ||
      missingTarget('reviews')
    ) {
      warning(t('users.validation.transferTargetRequired'))
      return
    }

    setRemovalSubmitting(true)
    try {
      await api.post(`/api/users/${removeStylistUser.id}/remove-stylist-role`, payload)
      success(t('users.toast.stylistRoleRemoved'))
      setRemoveStylistOpen(false)
      loadData()
    } catch (err) {
      if (getErrorCode(err) === 'USERS_STYLIST_PREVIEW_CHANGED') setRemoveStylistOpen(false)
      showApiError(err, 'users.errors.stylistRemovalFailed')
    } finally {
      setRemovalSubmitting(false)
    }
  }

  return {
    removalTriggerRef, removalPreviewSequence, removeStylistOpen, setRemoveStylistOpen, removeStylistUser,
    removalPreview, removalSubmitting, financialTarget, setFinancialTarget, financialConfirmed, setFinancialConfirmed,
    removalModes, setRemovalModes, removalTargets, setRemovalTargets, getTargetOptions, removalSummary, isRemovalReady,
    openRemoveStylist, handleConfirmRemoveStylist,
  }
}
