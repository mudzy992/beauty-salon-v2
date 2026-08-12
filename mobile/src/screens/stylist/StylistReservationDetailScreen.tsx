import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme';
import type { StylistScheduleStackParamList } from '../../navigation/types';
import { CancelReservationModal } from './reservation-detail/cancel-reservation-modal';
import { CompleteReservationModal } from './reservation-detail/complete-reservation-modal';
import { NoShowReservationModal } from './reservation-detail/no-show-reservation-modal';
import { OverrunReservationModal } from './reservation-detail/overrun-reservation-modal';
import { ReorderReservationModal } from './reservation-detail/reorder-reservation-modal';
import { ReservationDetailSummary } from './reservation-detail/reservation-detail-summary';
import { ReservationDetailActions } from './reservation-detail/reservation-detail-actions';
import { useStylistReservationDetail } from './reservation-detail/hooks/use-stylist-reservation-detail';
import { useReservationDetailStatus } from './reservation-detail/hooks/use-reservation-detail-status';
import { useReservationDetailActions } from './reservation-detail/hooks/use-reservation-detail-actions';

type Props = NativeStackScreenProps<
  StylistScheduleStackParamList,
  'StylistReservationDetail'
>;

export function StylistReservationDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { profileId } = useStylistProfile();
  const reservationId = route.params.reservationId;

  const { reservation, loading, refreshing, fetchReservation, onRefresh } =
    useStylistReservationDetail({ reservationId });

  const detailActions = useReservationDetailActions({
    reservation,
    fetchReservation,
    navigation,
  });

  const status = useReservationDetailStatus({
    reservation,
    profileId,
    onOverrunReschedule: detailActions.navigateToReschedulePreview,
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Rezervacija nije pronađena.</Text>
        <Button
          title="Nazad"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ReservationDetailSummary reservation={reservation} />
        <ReservationDetailActions
          reservation={reservation}
          profileId={profileId}
          {...status}
          startSubmitting={detailActions.startSubmitting}
          onStart={() => void detailActions.submitStart()}
          onOpenOverrun={() => detailActions.setOverrunModalOpen(true)}
          onOpenComplete={detailActions.openComplete}
          onOpenNoShow={detailActions.openNoShow}
          onOpenCancel={detailActions.openCancel}
          onOpenReorder={detailActions.openReorderModal}
        />
      </ScrollView>

      <CancelReservationModal
        visible={detailActions.cancelModalOpen}
        reason={detailActions.cancelReason}
        submitting={detailActions.cancelSubmitting}
        onReasonChange={detailActions.setCancelReason}
        onClose={() => detailActions.setCancelModalOpen(false)}
        onSubmit={() => void detailActions.submitCancel()}
      />
      <NoShowReservationModal
        visible={detailActions.noShowModalOpen}
        reason={detailActions.noShowReason}
        applyPenalty={detailActions.noShowApplyPenalty}
        submitting={detailActions.noShowSubmitting}
        onReasonChange={detailActions.setNoShowReason}
        onTogglePenalty={() => detailActions.setNoShowApplyPenalty((v) => !v)}
        onClose={() => detailActions.setNoShowModalOpen(false)}
        onSubmit={() => void detailActions.submitNoShow()}
      />
      <CompleteReservationModal
        visible={detailActions.completeModalOpen}
        reservation={reservation}
        profileId={profileId}
        actualPrice={detailActions.completeActualPrice}
        notes={detailActions.completeNotes}
        createDebt={detailActions.createDebt}
        submitting={detailActions.completeSubmitting}
        clientDebts={detailActions.clientDebts}
        clientDebtsLoading={detailActions.clientDebtsLoading}
        selectedDebtIds={detailActions.selectedDebtIds}
        completeChargeAmount={detailActions.completeChargeAmount}
        selectedDebtSum={detailActions.selectedDebtSum}
        onActualPriceChange={detailActions.setCompleteActualPrice}
        onNotesChange={detailActions.setCompleteNotes}
        onToggleCreateDebt={() => detailActions.setCreateDebt((v) => !v)}
        onToggleDebt={detailActions.handleToggleDebt}
        onClose={() => detailActions.setCompleteModalOpen(false)}
        onSubmit={() => void detailActions.submitComplete()}
      />
      <OverrunReservationModal
        visible={detailActions.overrunModalOpen}
        manualShiftMinutes={detailActions.manualShiftMinutes}
        onManualShiftMinutesChange={detailActions.setManualShiftMinutes}
        onClose={() => detailActions.setOverrunModalOpen(false)}
        onActualOverrun={() => detailActions.navigateToReschedulePreview('actual_overrun')}
        onManualMinutes={() => detailActions.navigateToReschedulePreview('manual_minutes')}
        onUseBreakOnly={() => detailActions.navigateToReschedulePreview('use_break_only')}
      />
      <ReorderReservationModal
        visible={detailActions.reorderModalOpen}
        startTime={detailActions.reorderStartTime}
        endTime={detailActions.reorderEndTime}
        submitting={detailActions.reorderSubmitting}
        onStartTimeChange={detailActions.handleReorderStartChange}
        onEndTimeChange={detailActions.setReorderEndTime}
        onClose={() => detailActions.setReorderModalOpen(false)}
        onSubmit={() => void detailActions.submitReorderRequest()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md },
});
