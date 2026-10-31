import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import api from '../../../../services/api';
import type { ClientDebt, DailyLogEntry, Reservation } from '../../../../types';
import type {
  NativeStackNavigationProp,
  StylistScheduleStackParamList,
} from '../../../../navigation/types';
import { computeCompleteMinCharge, getApiErrorMessage } from '../utils/reservation-detail';
import { normalizeClientDebts } from '../../../../utils/apiPayload';

type Navigation = NativeStackNavigationProp<
  StylistScheduleStackParamList,
  'StylistReservationDetail'
>;

type UseReservationCompleteFlowParams = {
  reservation: Reservation | null;
  fetchReservation: () => Promise<void>;
  navigation: Navigation;
};

export const useReservationCompleteFlow = ({
  reservation,
  fetchReservation,
  navigation,
}: UseReservationCompleteFlowParams) => {
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

  const fetchClientDebts = useCallback(async (clientId?: string) => {
    const generation = ++debtRequestGeneration.current;
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
      if (generation === debtRequestGeneration.current) setClientDebts(normalized);
    } catch {
      if (generation === debtRequestGeneration.current) setClientDebtsError(true);
    } finally {
      if (generation === debtRequestGeneration.current) setClientDebtsLoading(false);
    }
  }, []);

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
    if (!reservation || reservation.status !== 'IN_PROGRESS') return;
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
  }, [reservation, clientDebts]);

  const submitComplete = useCallback(async () => {
    if (!reservation) return;
    const paidRaw = parseFloat(completeActualPrice.replace(',', '.'));
    if (isNaN(paidRaw) || paidRaw < 0) {
      Alert.alert('Greška', 'Unesite ispravan iznos naplaćenog računa.');
      return;
    }
    if (selectedDebtSum > 0 && paidRaw < selectedDebtSum) {
      Alert.alert('Greška', 'Nedovoljno za naplatu označenih dugova.');
      return;
    }
    const shortfall = Math.max(0, completeChargeAmount - paidRaw);
    const tipAmount = Math.max(0, paidRaw - completeChargeAmount);
    const debtHandling = shortfall > 0 && createDebt ? 'CREATE_DEBT' : 'IGNORE_DEBT';
    setCompleteSubmitting(true);
    try {
      const selectedDebts = clientDebts.filter((d) => selectedDebtIds[d.id]);
      const { data: entry } = await api.post<DailyLogEntry>(
        `/api/daily-log/from-reservation/${reservation.id}`,
        {
          paidAmount: paidRaw,
          settledDebtIds: selectedDebts.map((d) => d.id),
          debtHandling,
          tipAmount,
          notes: completeNotes.trim() || undefined,
        },
      );
      setCompleteModalOpen(false);
      await fetchReservation();
      await fetchClientDebts(reservation.clientId);
      (
        navigation.getParent() as { navigate: (name: string, params: object) => void } | undefined
      )?.navigate('DailyLogTab', { screen: 'DailyLogDetail', params: { entryId: entry.id } });
    } catch (err: unknown) {
      Alert.alert('Greška', getApiErrorMessage(err, 'Greška pri upisu.'));
    } finally {
      setCompleteSubmitting(false);
    }
  }, [
    reservation,
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
  ]);

  const handleToggleDebt = useCallback((debtId: string) => {
    setSelectedDebtIds((prev) => ({ ...prev, [debtId]: !prev[debtId] }));
  }, []);

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
