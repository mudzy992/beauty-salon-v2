import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../../../../services/api';
import type { ClientDebt, Reservation } from '../../../../types';
import type {
  NativeStackNavigationProp,
  StylistScheduleStackParamList,
} from '../../../../navigation/types';
import { computeCompleteMinCharge, getApiErrorMessage } from '../utils/reservation-detail';
import { normalizeClientDebts, parseCreatedDailyLogEntryId } from '../../../../utils/apiPayload';
import type { ReservationActionIdentity } from './use-reservation-action-identity';

type Navigation = NativeStackNavigationProp<
  StylistScheduleStackParamList,
  'StylistReservationDetail'
>;

type UseReservationCompleteFlowParams = {
  reservation: Reservation | null;
  fetchReservation: () => Promise<void>;
  navigation: Navigation;
  identity: ReservationActionIdentity;
};

export const useReservationCompleteFlow = ({
  reservation,
  fetchReservation,
  navigation,
  identity,
}: UseReservationCompleteFlowParams) => {
  const { t } = useTranslation();
  const { beginAction, isCurrent, reservationId, userId } = identity;
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeActualPrice, setCompleteActualPrice] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [clientDebts, setClientDebts] = useState<ClientDebt[]>([]);
  const [clientDebtsLoading, setClientDebtsLoading] = useState(false);
  const [clientDebtsError, setClientDebtsError] = useState(false);
  const [selectedDebtIds, setSelectedDebtIds] = useState<Record<string, boolean>>({});
  const [createDebt, setCreateDebt] = useState(true);
  const debtRequestGeneration = useRef(0);
  const debtClientId = useRef<string | undefined>(undefined);

  useEffect(() => {
    debtRequestGeneration.current += 1;
    debtClientId.current = undefined;
    setCompleteModalOpen(false);
    setCompleteActualPrice('');
    setCompleteNotes('');
    setCompleteSubmitting(false);
    setClientDebts([]);
    setClientDebtsLoading(false);
    setClientDebtsError(false);
    setSelectedDebtIds({});
    setCreateDebt(true);
  }, [reservationId, userId]);

  const fetchClientDebts = useCallback(async (clientId?: string) => {
    if (!isCurrent()) return;
    const requestedUserId = userId;
    const requestedReservationId = reservationId;
    const generation = ++debtRequestGeneration.current;
    const isCurrentRead = () =>
      generation === debtRequestGeneration.current &&
      isCurrent() &&
      requestedUserId === userId &&
      requestedReservationId === reservationId;
    if (!clientId) {
      debtClientId.current = undefined;
      setClientDebts([]);
      setClientDebtsError(false);
      setClientDebtsLoading(false);
      setSelectedDebtIds({});
      return;
    }
    if (debtClientId.current !== clientId) {
      debtClientId.current = clientId;
      setClientDebts([]);
      setSelectedDebtIds({});
    }
    setClientDebtsError(false);
    setClientDebtsLoading(true);
    try {
      const { data } = await api.get<unknown>('/api/client-debts', { params: { clientId } });
      const normalized = normalizeClientDebts(data);
      if (!normalized) throw new Error();
      if (isCurrentRead()) setClientDebts(normalized);
    } catch {
      if (isCurrentRead()) setClientDebtsError(true);
    } finally {
      if (isCurrentRead()) setClientDebtsLoading(false);
    }
  }, [isCurrent, reservationId, userId]);

  useEffect(() => {
    void fetchClientDebts(reservation?.clientId);
    return () => { debtRequestGeneration.current += 1; };
  }, [reservation?.clientId, fetchClientDebts]);

  const selectedDebtSum = useMemo(() => {
    return clientDebts
      .filter((d) => selectedDebtIds[d.id])
      .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  }, [clientDebts, selectedDebtIds]);

  const completeMinCharge = useMemo(
    () => (reservation ? computeCompleteMinCharge(reservation) : 0),
    [reservation],
  );

  const completeChargeAmount = completeMinCharge + selectedDebtSum;

  const openComplete = useCallback(() => {
    if (!isCurrent() || !reservation || reservation.id !== reservationId || reservation.status !== 'IN_PROGRESS') return;
    const intent = !!reservation.payDebtsIntent;
    const nextSelected: Record<string, boolean> = {};
    if (intent) clientDebts.forEach((d) => { nextSelected[d.id] = true; });
    const debtsSum = intent
      ? clientDebts.reduce((acc, d) => acc + (Number(d.amount) || 0), 0)
      : 0;
    setSelectedDebtIds(nextSelected);
    setCreateDebt(true);
    setCompleteActualPrice(String(computeCompleteMinCharge(reservation) + debtsSum));
    setCompleteNotes('');
    setCompleteModalOpen(true);
  }, [clientDebts, isCurrent, reservation, reservationId]);

  const submitComplete = useCallback(async () => {
    if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
    const paidRaw = parseFloat(completeActualPrice.replace(',', '.'));
    if (isNaN(paidRaw) || paidRaw < 0) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.paidAmountInvalid'));
      return;
    }
    if (selectedDebtSum > 0 && paidRaw < selectedDebtSum) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.settledDebtAmountInsufficient'));
      return;
    }
    const isCurrentAction = beginAction();
    if (!isCurrentAction()) return;
    const shortfall = Math.max(0, completeChargeAmount - paidRaw);
    const tipAmount = Math.max(0, paidRaw - completeChargeAmount);
    const debtHandling = shortfall > 0 && createDebt ? 'CREATE_DEBT' : 'IGNORE_DEBT';
    setCompleteSubmitting(true);
    try {
      const selectedDebts = clientDebts.filter((d) => selectedDebtIds[d.id]);
      const { data: response } = await api.post<unknown>(
        `/api/daily-log/from-reservation/${reservationId}`,
        {
          paidAmount: paidRaw,
          settledDebtIds: selectedDebts.map((d) => d.id),
          debtHandling,
          tipAmount,
          notes: completeNotes.trim() || undefined,
        },
      );
      if (!isCurrentAction()) return;
      const entryId = parseCreatedDailyLogEntryId(response);
      if (!entryId) {
        setCompleteModalOpen(false);
        await fetchReservation();
        if (!isCurrentAction()) return;
        await fetchClientDebts(reservation.clientId);
        if (!isCurrentAction()) return;
        Alert.alert(t('common.error'), t('stylist.dailyLogDetail.saveResponseFallback'));
        return;
      }
      setCompleteModalOpen(false);
      await fetchReservation();
      if (!isCurrentAction()) return;
      await fetchClientDebts(reservation.clientId);
      if (!isCurrentAction()) return;
      (
        navigation.getParent() as { navigate: (name: string, params: object) => void } | undefined
      )?.navigate('DailyLogTab', { screen: 'DailyLogDetail', params: { entryId } });
    } catch (err: unknown) {
      if (!isCurrentAction()) return;
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.complete.errorFallback')),
      );
    } finally {
      if (isCurrentAction()) setCompleteSubmitting(false);
    }
  }, [
    beginAction,
    isCurrent,
    reservation,
    reservationId,
    completeActualPrice,
    completeNotes,
    fetchReservation,
    navigation,
    selectedDebtSum,
    completeChargeAmount,
    createDebt,
    clientDebts,
    selectedDebtIds,
    fetchClientDebts,
    t,
  ]);

  const handleToggleDebt = useCallback((debtId: string) => {
    if (!isCurrent()) return;
    setSelectedDebtIds((prev) => ({ ...prev, [debtId]: !prev[debtId] }));
  }, [isCurrent]);

  return {
    completeModalOpen,
    completeActualPrice,
    completeNotes,
    completeSubmitting,
    clientDebts,
    clientDebtsLoading,
    clientDebtsError,
    selectedDebtIds,
    createDebt,
    completeChargeAmount,
    selectedDebtSum,
    setCompleteActualPrice,
    setCompleteNotes,
    setCreateDebt,
    setCompleteModalOpen,
    submitComplete,
    openComplete,
    handleToggleDebt,
    fetchClientDebts,
  };
};
