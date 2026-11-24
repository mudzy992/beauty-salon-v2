import type { StylistRemovalPreview, StylistOption } from './user-types'
import type { RemovalKey, RemovalMode } from './stylist-removal-types'

export function assertRemovalPreview(preview: StylistRemovalPreview): void {
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
}

export function buildRemovalPayload(
  removalPreview: StylistRemovalPreview, financialTarget: string, financialConfirmed: boolean,
  removalModes: Record<RemovalKey, RemovalMode>, removalTargets: Partial<Record<RemovalKey, string>>,
) {
  const counts = removalPreview.counts
  return {
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
}

export function removalTargetOptions(allStylists: StylistOption[], removalPreview: StylistRemovalPreview | null) {
  const currentStylistId = removalPreview?.stylistProfileId
  return allStylists
    .filter(s => typeof s.id === 'string' && s.id.trim() !== '' && s.id !== currentStylistId && ['ACTIVE', 'PENDING'].includes(String(s.status ?? '').toUpperCase()))
    .map(s => ({
      id: s.id,
      label: [s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || s.user?.username || s.id,
      isPending: String(s.status ?? '').toUpperCase() !== 'ACTIVE' || s.isActive !== true || s.user?.isActive !== true,
    }))
}
