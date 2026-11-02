import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { fetchAllNormalizedPublicServices } from '../../services/catalog';
import { spacing } from '../../theme';
import type { Service } from '../../types';
import { getSalonDateOnly } from '../../utils/date';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  normalizeClientDebts,
  normalizeDailyLogClients,
  normalizeDailyLogEditorEntry,
  normalizeLoyaltyPreview,
  parseCreatedDailyLogEntryId,
  type LoyaltyPreview,
} from '../../utils/apiPayload';
import { DailyLogEntryPricingBlock } from './DailyLogEntryPricingBlock';
import {
  computeCharge,
  parsePaid,
  type OpenDebtRow,
} from './daily-log-entry-math';

type ClientOption = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  gender: 'MALE' | 'FEMALE' | null;
};

type Props = {
  route?: { params?: { entryId?: string } };
  navigation: {
    goBack: () => void;
    navigate: (screen: 'DailyLogDetail', params: { entryId: string }) => void;
  };
};

export function DailyLogNewEntryScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const editEntryId = route?.params?.entryId;
  const userId = useAuthStore((state) => state.user?.id);
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const {
    profileId,
    loading: profileLoading,
    loadError: profileLoadError,
    refetch: refetchProfile,
  } = useStylistProfile();
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesLoadError, setServicesLoadError] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsLoadError, setClientsLoadError] = useState(false);
  const serviceLoadGeneration = useRef(0);
  const clientLoadGeneration = useRef(0);
  const openDebtsLoadGeneration = useRef(0);
  const screenMounted = useRef(true);
  const actionGeneration = useRef(0);
  const observedUserId = useRef(userId);
  const previousUserId = useRef(userId);
  if (observedUserId.current !== userId) {
    observedUserId.current = userId;
    actionGeneration.current += 1;
    clientLoadGeneration.current += 1;
    openDebtsLoadGeneration.current += 1;
  }
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => getSalonDateOnly());
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [clientId, setClientId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paidTouched, setPaidTouched] = useState(false);
  const [createDebt, setCreateDebt] = useState(true);
  const [notes, setNotes] = useState('');
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyPreview | null>(null);
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState(0);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [loyaltyLoadError, setLoyaltyLoadError] = useState(false);
  const [loyaltyRetryCount, setLoyaltyRetryCount] = useState(0);
  const [openDebts, setOpenDebts] = useState<OpenDebtRow[]>([]);
  const [openDebtsLoading, setOpenDebtsLoading] = useState(false);
  const [openDebtsLoadError, setOpenDebtsLoadError] = useState(false);
  const [settleDebtsEnabled, setSettleDebtsEnabled] = useState(false);
  const [settledDebtIds, setSettledDebtIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);

  useEffect(() => {
    screenMounted.current = true;
    return () => {
      screenMounted.current = false;
      actionGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    if (previousUserId.current === userId) return;
    previousUserId.current = userId;
    actionGeneration.current += 1;
    setSaving(false);
    setClients([]);
    setClientId('');
    setClientSearch('');
    setServiceIds([]);
    setUnitPrices({});
    setPaidAmount('');
    setPaidTouched(false);
    setCreateDebt(true);
    setNotes('');
    setLoyaltyInfo(null);
    setDesiredLoyaltyPercent(0);
    setLoadingLoyalty(false);
    setLoyaltyLoadError(false);
    setLoyaltyRetryCount(0);
    setOpenDebts([]);
    setOpenDebtsLoading(false);
    setOpenDebtsLoadError(false);
    setSettleDebtsEnabled(false);
    setSettledDebtIds([]);
  }, [userId]);

  const beginAction = useCallback(() => {
    const generation = ++actionGeneration.current;
    const actionUserId = userId;
    const actionEntryId = editEntryId;
    return () =>
      screenMounted.current &&
      generation === actionGeneration.current &&
      editEntryId === actionEntryId &&
      useAuthStore.getState().user?.id === actionUserId;
  }, [editEntryId, userId]);

  const loadServices = useCallback(async () => {
    const generation = ++serviceLoadGeneration.current;
    setServicesLoading(true);
    setServicesLoadError(false);
    try {
      const serviceItems = await fetchAllNormalizedPublicServices({ activeOnly: true });
      if (serviceLoadGeneration.current === generation) setServices(serviceItems);
    } catch {
      if (serviceLoadGeneration.current === generation) setServicesLoadError(true);
    } finally {
      if (serviceLoadGeneration.current === generation) setServicesLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    const generation = ++clientLoadGeneration.current;
    const requestUserId = userId;
    if (!requestUserId) {
      setClients([]);
      setClientsLoadError(false);
      setClientsLoading(false);
      return;
    }
    setClientsLoading(true);
    setClientsLoadError(false);
    try {
      const { data } = await api.get<unknown>('/api/users/for-daily-log');
      const normalized = normalizeDailyLogClients(data);
      if (!normalized) throw new Error();
      if (
        clientLoadGeneration.current === generation &&
        useAuthStore.getState().user?.id === requestUserId
      ) {
        setClients(normalized);
      }
    } catch {
      if (
        clientLoadGeneration.current === generation &&
        useAuthStore.getState().user?.id === requestUserId
      ) {
        setClientsLoadError(true);
      }
    } finally {
      if (
        clientLoadGeneration.current === generation &&
        useAuthStore.getState().user?.id === requestUserId
      ) {
        setClientsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    void loadServices();
    void loadClients();
    return () => {
      serviceLoadGeneration.current += 1;
      clientLoadGeneration.current += 1;
    };
  }, [loadServices, loadClients]);

  useEffect(() => {
    if (!editEntryId) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<unknown>(`/api/daily-log/${editEntryId}`);
        if (!mounted || useAuthStore.getState().user?.id !== userId) return;
        const entry = normalizeDailyLogEditorEntry(data, editEntryId);
        if (!entry) throw new Error();
        if (entry.status === 'COMPLETED') {
          Alert.alert(t('common.info'), t('stylist.dailyLogDetail.editCompletedUnavailable'));
          navigation.goBack();
          return;
        }
        setDate(entry.date.slice(0, 10));
        setNotes(entry.notes ?? '');
        const ids =
          entry.items && entry.items.length > 0
            ? entry.items.map((x) => x.serviceId)
            : entry.serviceId
              ? [entry.serviceId]
              : [];
        setServiceIds(ids);
        const prices: Record<string, number> = {};
        (entry.items ?? []).forEach((it) => {
          prices[it.serviceId] = it.unitPrice ?? 0;
        });
        setUnitPrices(prices);
        setClientId(entry.clientId ?? entry.client?.id ?? '');
        setPaidTouched(true);
        const servicesPortion = entry.actualPrice;
        const debtPaymentEntries = entry.debtPaymentEntries;
        const debtsPortion = Array.isArray(debtPaymentEntries)
          ? debtPaymentEntries.reduce(
              (acc, row) => acc + Number(row.actualPrice ?? 0),
              0,
            )
          : 0;
        setPaidAmount(String(servicesPortion + debtsPortion));
      } catch {
        if (!mounted || useAuthStore.getState().user?.id !== userId) return;
        Alert.alert(t('common.error'), t('stylist.dailyLogDetail.loadErrorFallback'));
        navigation.goBack();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [editEntryId, navigation, t, userId]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedServices = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as Service[],
    [serviceIds, services],
  );
  const baseServices = selectedClient?.gender
    ? services.filter((s) => s.gender === selectedClient.gender)
    : services;
  const filteredServices = serviceSearch.trim()
    ? baseServices.filter((s) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
    : baseServices;
  const filteredClients = clientSearch.trim()
    ? clients.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.lastName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.username.toLowerCase().includes(clientSearch.toLowerCase()),
      )
    : clients;

  const loyaltyPercent =
    loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
      ? Math.max(0, Math.min(desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent))
      : 0;

  const charge = useMemo(
    () =>
      computeCharge({
        serviceIds,
        unitPrices,
        loyaltyPercent,
        settleDebtsEnabled: !editEntryId && settleDebtsEnabled,
        settledDebtIds,
        openDebts,
      }),
    [serviceIds, unitPrices, loyaltyPercent, settleDebtsEnabled, settledDebtIds, openDebts, editEntryId],
  );

  useEffect(() => {
    if (!paidTouched) {
      setPaidAmount(charge.chargeAmount > 0 ? charge.chargeAmount.toFixed(2) : '');
    }
  }, [charge.chargeAmount, paidTouched]);

  useEffect(() => {
    if (serviceIds.length === 0 || !clientId) {
      setLoyaltyInfo(null);
      setDesiredLoyaltyPercent(0);
      setLoadingLoyalty(false);
      setLoyaltyLoadError(false);
      return;
    }
    let mounted = true;
    const requestUserId = userId;
    setLoyaltyInfo(null);
    setDesiredLoyaltyPercent(0);
    setLoyaltyLoadError(false);
    setLoadingLoyalty(true);
    api
      .get<unknown>(`/api/loyalty/stylist/client/${clientId}`, {
        params: { serviceIds: serviceIds.join(',') },
      })
      .then((r) => {
        const normalized = normalizeLoyaltyPreview(r.data);
        if (!normalized) throw new Error();
        if (mounted && useAuthStore.getState().user?.id === requestUserId) {
          setLoyaltyInfo(normalized);
          setLoyaltyLoadError(false);
        }
      })
      .catch(() => {
        if (mounted && useAuthStore.getState().user?.id === requestUserId) {
          setLoyaltyInfo(null);
          setLoyaltyLoadError(true);
        }
      })
      .finally(() => {
        if (mounted && useAuthStore.getState().user?.id === requestUserId) setLoadingLoyalty(false);
      });
    return () => {
      mounted = false;
    };
  }, [serviceIds, clientId, userId, loyaltyRetryCount]);

  const loadOpenDebts = useCallback(async () => {
    const generation = ++openDebtsLoadGeneration.current;
    const requestUserId = userId;
    if (!requestUserId || !clientId || editEntryId) {
      setOpenDebts([]);
      setOpenDebtsLoading(false);
      setOpenDebtsLoadError(false);
      setSettledDebtIds([]);
      setSettleDebtsEnabled(false);
      return;
    }
    setOpenDebts([]);
    setOpenDebtsLoading(true);
    setOpenDebtsLoadError(false);
    setSettledDebtIds([]);
    setSettleDebtsEnabled(false);
    try {
      const { data } = await api.get<unknown>('/api/client-debts', { params: { clientId } });
      const debts = normalizeClientDebts(data);
      if (!debts || debts.some((debt) => debt.status !== 'OPEN')) {
        throw new Error();
      }
      if (
        openDebtsLoadGeneration.current === generation &&
        useAuthStore.getState().user?.id === requestUserId
      ) {
        setOpenDebts(debts.map(({ id, amount, createdAt, service }) => ({
          id,
          amount,
          createdAt,
          service: service ? { name: service.name } : null,
        })));
      }
    } catch {
      if (
        openDebtsLoadGeneration.current === generation &&
        useAuthStore.getState().user?.id === requestUserId
      ) {
        setOpenDebts([]);
        setOpenDebtsLoadError(true);
      }
    } finally {
      if (
        openDebtsLoadGeneration.current === generation &&
        useAuthStore.getState().user?.id === requestUserId
      ) {
        setOpenDebtsLoading(false);
      }
    }
  }, [clientId, editEntryId, userId]);

  useEffect(() => {
    void loadOpenDebts();
    return () => {
      openDebtsLoadGeneration.current += 1;
    };
  }, [loadOpenDebts]);

  const paidRaw = parsePaid(paidAmount, charge.chargeAmount);
  const tipPreview = Number.isFinite(paidRaw) ? Math.max(0, paidRaw - charge.chargeAmount) : 0;
  const shortfall = Number.isFinite(paidRaw) ? Math.max(0, charge.chargeAmount - paidRaw) : 0;

  const toggleService = (s: Service) => {
    setServiceIds((prev) => {
      const exists = prev.includes(s.id);
      if (exists) {
        setUnitPrices((p) => {
          const next = { ...p };
          delete next[s.id];
          return next;
        });
        return prev.filter((x) => x !== s.id);
      }
      setUnitPrices((p) => ({ ...p, [s.id]: Number(s.price ?? 0) }));
      return [...prev, s.id];
    });
    setDesiredLoyaltyPercent(0);
    setPaidTouched(false);
  };

  const selectClient = (c: ClientOption) => {
    setClientId(c.id);
    setClientSearch([c.firstName, c.lastName].filter(Boolean).join(' ') || c.username);
    setShowClientPicker(false);
    if (c.gender && selectedServices.some((s) => s.gender !== c.gender)) {
      setServiceIds([]);
      setUnitPrices({});
      setServiceSearch('');
    }
    setDesiredLoyaltyPercent(0);
    setPaidTouched(false);
    setCreateDebt(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!profileId) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.profileMissing'));
      return;
    }
    if (!clientId || !selectedClient?.gender) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.clientGenderRequired'));
      return;
    }
    if (serviceIds.length === 0) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.serviceRequired'));
      return;
    }
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.paidAmountInvalid'));
      return;
    }
    if (!editEntryId && settleDebtsEnabled && settledDebtIds.length > 0 && paidRaw < charge.debtsSum) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.settledDebtAmountInsufficient'));
      return;
    }
    const isCurrentRequest = beginAction();
    const debtHandling =
      !editEntryId && shortfall > 0 && createDebt ? 'CREATE_DEBT' : 'IGNORE_DEBT';
    const items = serviceIds.map((serviceId) => ({
      serviceId,
      unitPrice: Number(unitPrices[serviceId] ?? 0),
    }));
    setSaving(true);
    try {
      if (editEntryId) {
        await api.patch(`/api/daily-log/${editEntryId}`, {
          items,
          clientId,
          date,
          actualPrice: paidRaw,
          tipAmount: tipPreview,
          notes: notes.trim() || undefined,
          ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
        });
        if (!isCurrentRequest()) return;
        navigation.navigate('DailyLogDetail', { entryId: editEntryId });
        return;
      }
      const { data: response } = await api.post<unknown>('/api/daily-log', {
        stylistProfileId: profileId,
        items,
        clientId,
        date,
        paidAmount: paidRaw,
        actualPrice: paidRaw,
        debtHandling,
        tipAmount: tipPreview,
        notes: notes.trim() || undefined,
        isManual: true,
        settledDebtIds: settleDebtsEnabled ? settledDebtIds : undefined,
        ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
      });
      if (!isCurrentRequest()) return;
      const entryId = parseCreatedDailyLogEntryId(response);
      if (!entryId) {
        Alert.alert(t('common.error'), t('stylist.dailyLogDetail.saveResponseFallback'));
        return;
      }
      navigation.navigate('DailyLogDetail', { entryId });
    } catch (err: unknown) {
      if (isCurrentRequest()) {
        Alert.alert(
          t('common.error'),
          getApiErrorMessage(err, t('stylist.dailyLogDetail.saveErrorFallback')),
        );
      }
    } finally {
      if (isCurrentRequest()) setSaving(false);
    }
  }, [
    profileId,
    clientId,
    selectedClient?.gender,
    serviceIds,
    paidRaw,
    editEntryId,
    settleDebtsEnabled,
    settledDebtIds,
    charge.debtsSum,
    shortfall,
    createDebt,
    unitPrices,
    tipPreview,
    date,
    notes,
    loyaltyPercent,
    navigation,
    t,
    beginAction,
  ]);

  if (previousUserId.current !== userId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (profileLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!profileId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {profileLoadError ? (
          <EmptyState
            icon="person-outline"
            title={t('stylist.profile.profileLoadError')}
            actionLabel={t('stylist.profile.retryProfileLoad')}
            onAction={() => { void refetchProfile(); }}
          />
        ) : (
          <>
            <Text style={{ color: colors.text }}>{t('stylist.dailyLogDetail.profileMissing')}</Text>
            <Button title={t('common.back')} onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: spacing.md }} />
          </>
        )}
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarBottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('stylist.dailyLogDetail.clientLabel')}</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowClientPicker(true)}
          >
            <Text style={[styles.pickerText, { color: selectedClient ? colors.text : colors.textMuted }]}>
              {selectedClient
                ? [selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ') ||
                  selectedClient.username
                : t('stylist.dailyLogDetail.clientPlaceholder')}
            </Text>
          </TouchableOpacity>
          {clientsLoading && clients.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.recoveryNotice} />
          ) : null}
          {clientsLoadError ? (
            <View style={styles.recoveryNotice}>
              <Text style={{ color: colors.textSecondary }}>
                {t(
                  clients.length > 0
                    ? 'stylist.dailyLogDetail.clientListStaleMessage'
                    : 'stylist.dailyLogDetail.clientListLoadError',
                )}
              </Text>
              <Button title={t('common.retry')} variant="outline" onPress={() => void loadClients()} />
            </View>
          ) : null}
        </Card>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('stylist.dailyLogDetail.serviceLabel')}</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowServicePicker(true)}
            disabled={!selectedClient?.gender}
          >
            <Text style={[styles.pickerText, { color: selectedServices.length ? colors.text : colors.textMuted }]}>
              {!selectedClient
                ? t('stylist.dailyLogDetail.serviceSelectNeedsClient')
                : selectedServices.length > 0
                  ? t('stylist.dailyLogDetail.selectedServicesCount', { count: selectedServices.length })
                  : t('stylist.dailyLogDetail.servicePlaceholder')}
            </Text>
          </TouchableOpacity>
          {servicesLoading && services.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.recoveryNotice} />
          ) : null}
          {servicesLoadError ? (
            <View style={styles.recoveryNotice}>
              <Text style={{ color: colors.textSecondary }}>
                {t(services.length > 0 ? 'services.staleMessage' : 'services.loadErrorMessage')}
              </Text>
              <Button title={t('common.retry')} variant="outline" onPress={() => void loadServices()} />
            </View>
          ) : null}
          <DailyLogEntryPricingBlock
            colors={colors}
            selectedServices={selectedServices}
            unitPrices={unitPrices}
            onUnitPriceChange={(id, value) => {
              setUnitPrices((p) => ({ ...p, [id]: value }));
              setPaidTouched(false);
            }}
            onRemoveService={(id) => {
              const svc = services.find((s) => s.id === id);
              if (svc) toggleService(svc);
            }}
            openDebts={openDebts}
            openDebtsLoading={openDebtsLoading}
            openDebtsLoadError={openDebtsLoadError}
            onRetryOpenDebts={() => void loadOpenDebts()}
            settleDebtsEnabled={settleDebtsEnabled}
            onSettleDebtsEnabledChange={(v) => {
              setSettleDebtsEnabled(v);
              if (!v) setSettledDebtIds([]);
              setPaidTouched(false);
            }}
            settledDebtIds={settledDebtIds}
            onToggleDebt={(id) => {
              setSettledDebtIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              );
              setPaidTouched(false);
            }}
            chargeAmount={charge.chargeAmount}
            servicesSum={charge.servicesSum}
            loyaltyDiscount={charge.loyaltyDiscount}
            debtsSum={charge.debtsSum}
            paidAmount={paidAmount}
            onPaidAmountChange={(v) => {
              setPaidTouched(true);
              setPaidAmount(v);
            }}
            tipPreview={tipPreview}
            shortfall={shortfall}
            createDebt={createDebt}
            onCreateDebtChange={setCreateDebt}
            notes={notes}
            onNotesChange={setNotes}
            date={date}
            onDateChange={setDate}
            editMode={!!editEntryId}
          />
        </Card>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('stylist.dailyLogDetail.loyaltyTitle')}
          </Text>
          {loadingLoyalty ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : loyaltyLoadError ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.error }}>{t('reservation.loyaltyPreviewLoadError')}</Text>
              <Button
                title={t('common.retry')}
                onPress={() => setLoyaltyRetryCount((current) => current + 1)}
                variant="outline"
                size="sm"
              />
            </View>
          ) : loyaltyInfo?.enabled &&
            loyaltyInfo?.hasAccount &&
            loyaltyInfo?.redeemEnabled &&
            loyaltyInfo?.service ? (
            <>
              <Text style={{ color: colors.text }}>
                {t('stylist.dailyLogDetail.loyaltyPointsAndMaximum', {
                  points: loyaltyInfo.points ?? 0,
                  maxPercent: loyaltyInfo.service.maxDiscountPercent,
                })}
              </Text>
              <Input
                label={t('stylist.dailyLogDetail.loyaltyDiscountLabel')}
                value={String(desiredLoyaltyPercent)}
                onChangeText={(v) => {
                  const n = Math.max(
                    0,
                    Math.min(parseInt(v || '0', 10) || 0, loyaltyInfo.service?.maxDiscountPercent ?? 0),
                  );
                  setDesiredLoyaltyPercent(n);
                  setPaidTouched(false);
                }}
                keyboardType="number-pad"
              />
            </>
          ) : (
            <Text style={{ color: colors.textMuted }}>
              {t('stylist.dailyLogDetail.loyaltyUnavailable')}
            </Text>
          )}
        </Card>
        <Button
          title={
            editEntryId
              ? t('stylist.dailyLogDetail.saveEntry')
              : t('stylist.dailyLogDetail.createEntry')
          }
          onPress={handleSubmit}
          loading={saving}
        />
      </ScrollView>

      <Modal visible={showServicePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={{ ...styles.pickerModal, backgroundColor: colors.surface }}>
            <Text style={[styles.pickerModalTitle, { color: colors.text }]}>{t('stylist.dailyLogDetail.servicePlaceholder')}</Text>
            <Input placeholder={t('common.search')} value={serviceSearch} onChangeText={setServiceSearch} />
            {servicesLoading && services.length === 0 ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.recoveryNotice} />
            ) : null}
            {servicesLoadError ? (
              <View style={styles.recoveryNotice}>
                <Text style={{ color: colors.textSecondary }}>
                  {t(services.length > 0 ? 'services.staleMessage' : 'services.loadErrorMessage')}
                </Text>
                <Button title={t('common.retry')} variant="outline" onPress={() => void loadServices()} />
              </View>
            ) : null}
            {!servicesLoading && !servicesLoadError && filteredServices.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('services.noServices')}</Text>
            ) : null}
            <FlatList
              data={filteredServices}
              keyExtractor={(s) => s.id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.pickerItem, { borderColor: colors.border }]} onPress={() => toggleService(item)}>
                  <Text style={{ color: colors.text, flex: 1 }}>{item.name}</Text>
                  <Text style={{ color: serviceIds.includes(item.id) ? colors.primary : colors.textMuted }}>
                    {serviceIds.includes(item.id) ? '✓' : Number(item.price).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button title={t('common.ok')} variant="outline" onPress={() => setShowServicePicker(false)} />
          </Card>
        </View>
      </Modal>
      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={{ ...styles.pickerModal, backgroundColor: colors.surface }}>
            <Text style={[styles.pickerModalTitle, { color: colors.text }]}>{t('stylist.dailyLogDetail.clientPlaceholder')}</Text>
            <Input placeholder={t('common.search')} value={clientSearch} onChangeText={setClientSearch} />
            {clientsLoading && clients.length === 0 ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.recoveryNotice} />
            ) : null}
            {clientsLoadError ? (
              <View style={styles.recoveryNotice}>
                <Text style={{ color: colors.textSecondary }}>
                  {t(
                    clients.length > 0
                      ? 'stylist.dailyLogDetail.clientListStaleMessage'
                      : 'stylist.dailyLogDetail.clientListLoadError',
                  )}
                </Text>
                <Button title={t('common.retry')} variant="outline" onPress={() => void loadClients()} />
              </View>
            ) : null}
            {!clientsLoading && !clientsLoadError && filteredClients.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('common.noResults')}</Text>
            ) : null}
            <FlatList
              data={filteredClients.slice(0, 50)}
              keyExtractor={(c) => c.id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.pickerItem, { borderColor: colors.border }]} onPress={() => selectClient(item)}>
                  <Text style={{ color: colors.text }}>
                    {[item.firstName, item.lastName].filter(Boolean).join(' ') || item.username}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button title={t('common.close')} variant="outline" onPress={() => setShowClientPicker(false)} />
          </Card>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: 4, fontWeight: '600' },
  pickerBtn: { borderWidth: 1, borderRadius: 8, padding: 14 },
  pickerText: { fontSize: 16 },
  recoveryNotice: { marginTop: spacing.sm, gap: spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.md },
  pickerModal: { padding: spacing.md, maxHeight: '80%' },
  pickerModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  pickerList: { maxHeight: 300, marginBottom: spacing.sm },
  pickerItem: { padding: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
