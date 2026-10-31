import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  BackHandler,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { MediaBackdrop } from '../../components/MediaImage';
import { Button } from '../../components/ui/Button';
import api, { getUploadUrl } from '../../services/api';
import { fetchAllNormalizedPublicServices } from '../../services/catalog';
import { spacing, borderRadius } from '../../theme';
import { formatDate, formatTime, getDateRange, getSalonDateOnly, getSalonTime } from '../../utils/date';
import { useAvailabilitySocketRefresh } from '../../hooks/useAvailabilitySocketRefresh';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  normalizeDebtAmounts,
  normalizeLoyaltyPreview,
  normalizePublicServices,
  sumDebtAmounts,
} from '../../utils/apiPayload';
import type { LoyaltyPreview } from '../../utils/apiPayload';
import type { ServicesScreenProps } from '../../navigation/types';
import type { Service, TimeSlot } from '../../types';
import { normalizeAvailableDates, normalizeAvailableSlots } from './reservation-availability';
import {
  createIdempotencyKey,
  type PendingIdempotentRequest,
} from '../../utils/idempotency-key';

type Step = 1 | 2 | 3 | 4;

type LoyaltyInfo = LoyaltyPreview;

export function ReservationScreen({ route, navigation }: ServicesScreenProps<'Reservation'>) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const user = useAuthStore((state) => state.user);
  const initialServiceId = route.params?.serviceId;
  const startAtStep = route.params?.startAtStep;
  const origin = route.params?.origin;
  const requestId = route.params?.requestId;
  const originCategoryId = route.params?.originCategoryId;
  const originCategoryName = route.params?.originCategoryName;

  const [step, setStep] = useState<Step>(startAtStep ?? (initialServiceId ? 2 : 1));
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [availableDates, setAvailableDates] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [datesLoading, setDatesLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [datesError, setDatesError] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState<number>(0);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyLoadError, setLoyaltyLoadError] = useState(false);
  const [payDebtsIntent, setPayDebtsIntent] = useState(false);
  const [openDebtsTotal, setOpenDebtsTotal] = useState<number | null>(null);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [debtsLoadError, setDebtsLoadError] = useState(false);
  const bookingAttemptRef = useRef<PendingIdempotentRequest>(null);
  const datesRequestIdRef = useRef(0);
  const slotsRequestIdRef = useRef(0);
  const loyaltyRequestIdRef = useRef(0);
  const debtsRequestIdRef = useRef(0);
  const servicesById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const selectedServiceIds = useMemo(
    () => selectedServices.map((s) => s.id),
    [selectedServices],
  );
  const selectedServicesLabel = useMemo(() => {
    if (selectedServices.length === 0) return '';
    if (selectedServices.length === 1) return selectedServices[0]!.name;
    return `${selectedServices[0]!.name} + ${selectedServices.length - 1}`;
  }, [selectedServices]);

  // Load all services for step 1
  useEffect(() => {
    (async () => {
      try {
        setServices(await fetchAllNormalizedPublicServices({ activeOnly: true }));
      } catch { /* silent */ }
    })();
  }, []);

  useEffect(() => {
    if (user?.gender) return;
    Alert.alert(
      t('common.error'),
      'Spol je obavezan za rezervacije. Molimo dopunite profil.',
      [{ text: t('common.ok'), onPress: () => navigation.getParent()?.navigate('ProfileTab') }],
    );
  }, [navigation, t, user?.gender]);

  // Re-apply preselected service whenever route request changes (important for repeated entry from Home).
  useEffect(() => {
    if (!initialServiceId) return;
    const fromList = servicesById.get(initialServiceId);
    if (fromList && (!user?.gender || fromList.gender === user.gender)) {
      datesRequestIdRef.current += 1;
      slotsRequestIdRef.current += 1;
      setSelectedServices([fromList]);
      setAvailableDates({});
      setDatesError(false);
      setSelectedDate(null);
      setSlots([]);
      setSelectedSlot(null);
      setNotes('');
      setDesiredLoyaltyPercent(0);
      setLoyaltyInfo(null);
      setStep((startAtStep ?? 2) as Step);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get<unknown>(`/api/services/${initialServiceId}`);
        const service = normalizePublicServices([data])?.[0];
        if (!service) throw new Error('Invalid public service payload');
        if (user?.gender && service.gender !== user.gender) {
          setStep(1);
          return;
        }
        datesRequestIdRef.current += 1;
        slotsRequestIdRef.current += 1;
        setSelectedServices([service]);
        setAvailableDates({});
        setDatesError(false);
        setSelectedDate(null);
        setSlots([]);
        setSelectedSlot(null);
        setNotes('');
        setDesiredLoyaltyPercent(0);
        setLoyaltyInfo(null);
        setStep((startAtStep ?? 2) as Step);
      } catch {
        setStep(1);
      }
    })();
  }, [initialServiceId, requestId, servicesById, user?.gender, startAtStep]);

  useEffect(() => () => {
    datesRequestIdRef.current += 1;
    slotsRequestIdRef.current += 1;
    loyaltyRequestIdRef.current += 1;
    debtsRequestIdRef.current += 1;
  }, []);

  // Load available dates when service is selected
  const loadAvailableDates = useCallback(async () => {
    const requestId = ++datesRequestIdRef.current;
    setAvailableDates({});
    setDatesError(false);
    if (selectedServiceIds.length === 0) {
      setDatesLoading(false);
      return;
    }

    setDatesLoading(true);
    const { fromDate, toDate } = getDateRange(60);
    try {
      const { data } = await api.get<unknown>('/api/reservations/availability/dates', {
        params: { serviceIds: selectedServiceIds.join(','), fromDate, toDate },
      });
      if (requestId !== datesRequestIdRef.current) return;
      const dateMap = normalizeAvailableDates(data);
      if (!dateMap) throw new Error('Invalid availability dates response.');
      setAvailableDates(dateMap);
    } catch {
      if (requestId === datesRequestIdRef.current) {
        setAvailableDates({});
        setDatesError(true);
      }
    } finally {
      if (requestId === datesRequestIdRef.current) setDatesLoading(false);
    }
  }, [selectedServiceIds]);

  const loadSlotsForDate = useCallback(async (date: string) => {
    const requestId = ++slotsRequestIdRef.current;
    setSlots([]);
    setSlotsError(false);
    if (selectedServiceIds.length === 0 || !date) {
      setSlotsLoading(false);
      return;
    }

    setSlotsLoading(true);
    try {
      const { data } = await api.get<unknown>('/api/reservations/availability/slots', {
        params: { serviceIds: selectedServiceIds.join(','), date },
      });
      if (requestId !== slotsRequestIdRef.current) return;
      const normalizedSlots = normalizeAvailableSlots(data);
      if (!normalizedSlots) throw new Error('Invalid availability slots response.');
      setSlots(normalizedSlots);
    } catch {
      if (requestId === slotsRequestIdRef.current) {
        setSlots([]);
        setSlotsError(true);
      }
    } finally {
      if (requestId === slotsRequestIdRef.current) setSlotsLoading(false);
    }
  }, [selectedServiceIds]);

  useEffect(() => {
    void loadAvailableDates();
  }, [loadAvailableDates]);

  useEffect(() => {
    if (!selectedDate) return;
    void loadSlotsForDate(selectedDate);
  }, [selectedDate, loadSlotsForDate]);

  const onAvailabilityChanged = useCallback(
    (payload: { date?: string }) => {
      void loadAvailableDates();
      if (selectedDate && payload.date === selectedDate) {
        void loadSlotsForDate(selectedDate);
      }
    },
    [loadAvailableDates, loadSlotsForDate, selectedDate],
  );
  useAvailabilitySocketRefresh(selectedServiceIds, onAvailabilityChanged);

  useEffect(() => {
    loyaltyRequestIdRef.current += 1;
    setLoyaltyInfo(null);
    setDesiredLoyaltyPercent(0);
    setLoyaltyLoading(false);
    setLoyaltyLoadError(false);
  }, [selectedServiceIds]);

  useEffect(() => {
    debtsRequestIdRef.current += 1;
    setOpenDebtsTotal(null);
    setDebtsLoading(false);
    setDebtsLoadError(false);
  }, [user?.id]);

  const loadLoyaltyPreview = useCallback(async () => {
    if (selectedServiceIds.length === 0) {
      setLoyaltyInfo(null);
      setLoyaltyLoadError(false);
      return;
    }
    const requestId = ++loyaltyRequestIdRef.current;
    setLoyaltyLoading(true);
    setLoyaltyLoadError(false);
    try {
      const { data } = await api.get<unknown>('/api/loyalty/client/me', {
        params: { serviceIds: selectedServiceIds.join(',') },
      });
      if (requestId !== loyaltyRequestIdRef.current) return;
      const preview = normalizeLoyaltyPreview(data);
      if (!preview) throw new Error('Invalid loyalty preview response');
      setLoyaltyInfo(preview);
    } catch {
      if (requestId === loyaltyRequestIdRef.current) setLoyaltyLoadError(true);
    } finally {
      if (requestId === loyaltyRequestIdRef.current) setLoyaltyLoading(false);
    }
  }, [selectedServiceIds]);

  const loadDebtPreview = useCallback(async () => {
    if (!user?.id) {
      setOpenDebtsTotal(null);
      setDebtsLoadError(false);
      return;
    }
    const requestId = ++debtsRequestIdRef.current;
    setDebtsLoading(true);
    setDebtsLoadError(false);
    try {
      const { data } = await api.get<unknown>('/api/client-debts/me');
      if (requestId !== debtsRequestIdRef.current) return;
      const debts = normalizeDebtAmounts(data);
      if (!debts) throw new Error('Invalid debt preview response');
      setOpenDebtsTotal(sumDebtAmounts(debts));
    } catch {
      if (requestId === debtsRequestIdRef.current) setDebtsLoadError(true);
    } finally {
      if (requestId === debtsRequestIdRef.current) setDebtsLoading(false);
    }
  }, [user?.id]);

  const filteredServices = useMemo(() => {
    const servicesByGender = user?.gender
      ? services.filter((service) => service.gender === user.gender)
      : [];
    if (!searchQuery.trim()) return servicesByGender;
    const q = searchQuery.toLowerCase();
    return servicesByGender.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.shortDescription?.toLowerCase().includes(q),
    );
  }, [services, searchQuery, user?.gender]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { disabled?: boolean; disableTouchEvent?: boolean; selected?: boolean; selectedColor?: string; dotColor?: string; marked?: boolean }> = {};
    Object.entries(availableDates).forEach(([date, available]) => {
      if (available) {
        marks[date] = {
          marked: true,
          dotColor: colors.primary,
          ...(date === selectedDate
            ? { selected: true, selectedColor: colors.primary }
            : {}),
        };
      } else {
        marks[date] = { disabled: true, disableTouchEvent: true };
      }
    });
    if (selectedDate && marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary };
    }
    return marks;
  }, [availableDates, selectedDate, colors]);

  const handleToggleService = useCallback((service: Service) => {
    datesRequestIdRef.current += 1;
    slotsRequestIdRef.current += 1;
    setDatesLoading(false);
    setSlotsLoading(false);
    setSelectedServices((prev) => {
      const exists = prev.some((x) => x.id === service.id);
      return exists ? prev.filter((x) => x.id !== service.id) : [...prev, service];
    });
    setAvailableDates({});
    setDatesError(false);
    setSelectedDate(null);
    setSlots([]);
    setSlotsError(false);
    setSelectedSlot(null);
  }, []);

  const handleContinueFromServices = useCallback(() => {
    if (selectedServices.length === 0) return;
    setStep(2);
  }, [selectedServices.length]);

  const handleSelectDate = useCallback((day: DateData) => {
    if (availableDates[day.dateString]) {
      slotsRequestIdRef.current += 1;
      setSlotsLoading(false);
      setSlots([]);
      setSlotsError(false);
      setSelectedDate(day.dateString);
      setSelectedSlot(null);
      setStep(3);
    }
  }, [availableDates]);

  const handleSelectSlot = useCallback((slot: TimeSlot) => {
    if (slot.holdState === 'pending_hold' && slot.availableStylistCount === 0) return;
    setSelectedSlot(slot);
    setStep(4);
    setDesiredLoyaltyPercent(0);
    setPayDebtsIntent(false);
    void loadLoyaltyPreview();
    void loadDebtPreview();
  }, [loadDebtPreview, loadLoyaltyPreview]);

  const handleSubmit = async () => {
    if (selectedServiceIds.length === 0 || !selectedDate || !selectedSlot) return;
    if (user?.mustChangePassword) {
      Alert.alert(t('common.error'), 'Prvo morate promijeniti inicijalnu lozinku.', [
        { text: t('common.ok'), onPress: () => router.replace('/') },
      ]);
      return;
    }
    if (!user?.email || !user?.phone || !user?.isEmailVerified) {
      Alert.alert(
        t('common.error'),
        'Za rezervaciju unesite email i telefon, te verifikujte email.',
        [{ text: t('common.ok'), onPress: () => router.replace('/') }],
      );
      return;
    }
    setSubmitting(true);
    const payload = {
      serviceIds: selectedServiceIds,
      reservationDate: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      clientNotes: notes.trim() || undefined,
      ...(desiredLoyaltyPercent > 0 ? { desiredLoyaltyPercent } : {}),
      ...(payDebtsIntent ? { payDebtsIntent: true } : {}),
    };
    const fingerprint = JSON.stringify(payload);
    const pending = bookingAttemptRef.current;
    const idempotencyKey =
      pending?.fingerprint === fingerprint ? pending.key : createIdempotencyKey();
    bookingAttemptRef.current = { fingerprint, key: idempotencyKey };
    try {
      await api.post('/api/reservations', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      bookingAttemptRef.current = null;
      Alert.alert(t('reservation.success'), t('reservation.successMessage'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.getParent()?.navigate('ReservationsTab'),
        },
      ]);
    } catch (error: unknown) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('reservation.submitError')));
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToOrigin = useCallback(() => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
    } catch {
      // navigation not ready or stack empty
    }

    const parent = navigation.getParent();
    if (origin === 'service-detail' && originCategoryId && originCategoryName) {
      parent?.navigate('ServicesTab', {
        screen: 'ServiceDetail',
        params: { categoryId: originCategoryId, categoryName: originCategoryName },
      } as any);
      return;
    }

    if (origin === 'home') {
      parent?.navigate('HomeTab' as any);
      return;
    }

    parent?.navigate('ServicesTab', { screen: 'Services' } as any);
  }, [navigation, origin, originCategoryId, originCategoryName]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      goBackToOrigin();
      return;
    }

    if (step === 2) {
      setStep(1);
      setSelectedDate(null);
      setSelectedSlot(null);
      setDesiredLoyaltyPercent(0);
      setLoyaltyInfo(null);
      return;
    }

    if (step === 3) {
      setStep(2);
      setSelectedDate(null);
      setSelectedSlot(null);
      return;
    }

    // step === 4
    setStep(3);
    setSelectedSlot(null);
  }, [goBackToOrigin, step]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const stepIndicator = (
    <View style={styles.steps}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: s <= step ? colors.primary : colors.border,
              },
            ]}
          >
            {s < step && <Ionicons name="checkmark" size={12} color={colors.primaryText} />}
            {s === step && <Text style={[styles.stepNum, { color: colors.primaryText }]}>{s}</Text>}
            {s > step && <Text style={[styles.stepNum, { color: colors.textMuted }]}>{s}</Text>}
          </View>
          {s < 4 && (
            <View style={[styles.stepLine, { backgroundColor: s < step ? colors.primary : colors.border }]} />
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {stepIndicator}

      {/* Step 1: Select Service */}
      {step === 1 && (
        <View style={styles.flex}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.inputText }]}
              placeholder={t('common.search')}
              placeholderTextColor={colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <FlatList
            data={filteredServices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg + tabBarBottom }]}
            contentInsetAdjustmentBehavior="automatic"
            renderItem={({ item }) => {
              const heroUri = item.heroImage ? getUploadUrl(item.heroImage) : null;
              const isSelected = selectedServiceIds.includes(item.id);
              return (
                <Card onPress={() => handleToggleService(item)} style={[styles.serviceItem, styles.serviceItemBackdrop]} padded={false}>
                    <MediaBackdrop
                      uri={heroUri}
                      style={styles.serviceItemBackdropImage}
                      imageStyle={styles.serviceItemBackdropImageStyle}
                    >
                      <View
                        style={[
                          styles.serviceItemBackdropOverlay,
                          { backgroundColor: isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.5)' },
                        ]}
                      />
                      <View style={styles.serviceItemBackdropContent}>
                        <Text style={styles.serviceItemNameOverlay}>{item.name}</Text>
                        <Text style={styles.serviceItemDurationOverlay}>{item.durationMinutes} min</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      ) : null}
                    </MediaBackdrop>
                </Card>
              );
            }}
          />
          <View style={{ padding: spacing.md, paddingBottom: spacing.md + tabBarBottom }}>
            <Button
              title={selectedServices.length > 0 ? 'Nastavi' : 'Odaberite servis'}
              onPress={handleContinueFromServices}
              disabled={selectedServices.length === 0}
            />
          </View>
        </View>
      )}

      {/* Step 2: Select Date */}
      {step === 2 && (
        <ScrollView
          contentContainerStyle={[styles.stepContent, { paddingBottom: spacing.xl + tabBarBottom }]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>
              {t('reservation.service')}
            </Text>
            <View style={styles.selectedServicesWrap}>
              {selectedServices.map((s) => (
                <View key={s.id} style={[styles.selectedChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{s.name}</Text>
                </View>
              ))}
            </View>
          </Card>

          {datesLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : datesError ? (
            <View style={styles.availabilityError}>
              <Text style={[styles.noSlots, { color: colors.textSecondary }]}>
                {t('reservation.availabilityError')}
              </Text>
              <Button title={t('common.retry')} onPress={() => { void loadAvailableDates(); }} variant="outline" />
            </View>
          ) : (
            <Calendar
              onDayPress={handleSelectDate}
              markedDates={markedDates}
              minDate={getSalonDateOnly()}
              theme={{
                backgroundColor: colors.background,
                calendarBackground: colors.card,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.primaryText,
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.textMuted,
                monthTextColor: colors.text,
                arrowColor: colors.primary,
                dotColor: colors.primary,
                selectedDotColor: colors.primaryText,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
              }}
              style={styles.calendar}
            />
          )}

          <Button
            title={t('common.back')}
            onPress={handleBack}
            variant="ghost"
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      )}

      {/* Step 3: Select Time Slot */}
      {step === 3 && (
        <ScrollView
          contentContainerStyle={[styles.stepContent, { paddingBottom: spacing.xl + tabBarBottom }]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>
              {t('reservation.service')}
            </Text>
            <Text style={[styles.selectedValue, { color: colors.text }]}>
              {selectedServicesLabel}
            </Text>
            <Text style={[styles.selectedLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {t('reservation.date')}
            </Text>
            <Text style={[styles.selectedValue, { color: colors.text }]}>
              {selectedDate ? formatDate(selectedDate) : ''}
            </Text>
          </Card>

          {slotsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : slotsError ? (
            <View style={styles.availabilityError}>
              <Text style={[styles.noSlots, { color: colors.textSecondary }]}>
                {t('reservation.availabilityError')}
              </Text>
              <Button
                title={t('common.retry')}
                onPress={() => { void loadSlotsForDate(selectedDate ?? ''); }}
                variant="outline"
              />
            </View>
          ) : slots.length === 0 ? (
            <Text style={[styles.noSlots, { color: colors.textSecondary }]}>
              {t('reservation.noSlots')}
            </Text>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                const now = new Date();
                const todaySalon = getSalonDateOnly(now);
                const nowHHMM = getSalonTime(now);
                const isPastSlot = selectedDate === todaySalon && slot.startTime.slice(0, 5) < nowHHMM;
                const isHeld = slot.holdState === 'pending_hold' && slot.availableStylistCount === 0;
                const isDisabled = isPastSlot || isHeld;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => !isDisabled && handleSelectSlot(slot)}
                    disabled={isDisabled}
                    style={[
                      styles.slotChip,
                      {
                        backgroundColor: isPastSlot
                          ? colors.background
                          : isHeld
                            ? colors.background
                            : isSelected
                              ? colors.primary
                              : colors.surface,
                        borderColor: isHeld
                          ? colors.border
                          : isPastSlot
                          ? colors.border
                          : isSelected
                            ? colors.primary
                            : colors.border,
                        opacity: isDisabled ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        { color: isSelected && !isHeld ? colors.primaryText : colors.text },
                      ]}
                    >
                      {formatTime(slot.startTime)}
                    </Text>
                    {isHeld ? (
                      <Text style={[styles.slotHint, { color: colors.textMuted }]}>uskoro?</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Button
            title={t('common.back')}
            onPress={handleBack}
            variant="ghost"
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <ScrollView
          contentContainerStyle={[styles.stepContent, { paddingBottom: spacing.xl + tabBarBottom }]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.reviewTitle, { color: colors.text }]}>
            {t('reservation.review')}
          </Text>

          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
                {t('reservation.service')}
              </Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>
                {selectedServicesLabel}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
                {t('reservation.date')}
              </Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>
                {selectedDate ? formatDate(selectedDate) : ''}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
                {t('reservation.time')}
              </Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>
                {selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : ''}
              </Text>
            </View>
          </Card>

          {loyaltyLoading && !loyaltyInfo ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: spacing.md }} />
          ) : null}
          {loyaltyLoadError ? (
            <Card style={{ marginBottom: spacing.md, borderColor: colors.error }}>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                {t('reservation.loyaltyPreviewLoadError')}
              </Text>
              {loyaltyInfo ? (
                <Text style={{ color: colors.textMuted, marginBottom: spacing.sm }}>
                  {t('reservation.previewStale')}
                </Text>
              ) : null}
              <Button
                title={t('common.retry')}
                onPress={() => { void loadLoyaltyPreview(); }}
                variant="outline"
              />
            </Card>
          ) : null}

          {debtsLoading && openDebtsTotal === null ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: spacing.md }} />
          ) : null}
          {debtsLoadError ? (
            <Card style={{ marginBottom: spacing.md, borderColor: colors.error }}>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                {t('reservation.debtPreviewLoadError')}
              </Text>
              {openDebtsTotal !== null ? (
                <Text style={{ color: colors.textMuted, marginBottom: spacing.sm }}>
                  {t('reservation.previewStale')}
                </Text>
              ) : null}
              <Button
                title={t('common.retry')}
                onPress={() => { void loadDebtPreview(); }}
                variant="outline"
              />
            </Card>
          ) : null}

          {loyaltyInfo &&
            loyaltyInfo.enabled &&
            loyaltyInfo.redeemEnabled &&
            loyaltyInfo.hasAccount &&
            loyaltyInfo.service &&
            loyaltyInfo.service.maxDiscountPercent > 0 && (
              <Card style={{ marginBottom: spacing.md }}>
                <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>
                  Loyalty popust
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  Status: {loyaltyInfo.tier ?? 'Nema nivoa'} · Bodovi: {loyaltyInfo.points ?? 0}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  Maks. popust za ovu uslugu: {loyaltyInfo.service.maxDiscountPercent}% (
                  ≈ {loyaltyInfo.service.maxDiscountAmount.toFixed(2)} KM){' '}
                  · Maks. bodova koje možete iskoristiti: {loyaltyInfo.service.maxUsablePoints}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  (Stvarni limit zavisi i od globalnih postavki – backend će odbiti prevelik popust ili nedovoljan
                  broj bodova.)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                  <TextInput
                    style={[
                      styles.loyaltyInput,
                      {
                        color: colors.inputText,
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                    keyboardType="number-pad"
                    value={String(desiredLoyaltyPercent || 0)}
                    onChangeText={(text) => {
                      const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
                      if (isNaN(n) || n < 0) {
                        setDesiredLoyaltyPercent(0);
                      } else {
                        const capped = Math.min(
                          n,
                          loyaltyInfo.service ? loyaltyInfo.service.maxDiscountPercent : 100,
                        );
                        setDesiredLoyaltyPercent(capped);
                      }
                    }}
                  />
                  <Text style={{ color: colors.textSecondary }}>%</Text>
                </View>
              </Card>
            )}

          {openDebtsTotal !== null && openDebtsTotal > 0 ? (
            <TouchableOpacity
              onPress={() => setPayDebtsIntent((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginBottom: spacing.md,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Ionicons
                name={payDebtsIntent ? 'checkbox' : 'square-outline'}
                size={22}
                color={colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Plaćam i dugovanje</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                  Otvoreno: {openDebtsTotal.toFixed(2)} KM
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
            {t('reservation.addNotes')}
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: colors.inputText,
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
              },
            ]}
            placeholder={t('reservation.notesPlaceholder')}
            placeholderTextColor={colors.inputPlaceholder}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Button
            title={t('reservation.submit')}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            style={{ marginTop: spacing.lg }}
          />

          <Button
            title={t('common.back')}
            onPress={handleBack}
            variant="ghost"
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  serviceItem: { marginBottom: spacing.sm, overflow: 'hidden' },
  serviceItemBackdrop: { minHeight: 80 },
  serviceItemBackdropImage: { minHeight: 80, padding: spacing.md, justifyContent: 'flex-end' },
  serviceItemBackdropImageStyle: { borderRadius: borderRadius.lg },
  serviceItemBackdropOverlay: { ...StyleSheet.absoluteFill, borderRadius: borderRadius.lg },
  serviceItemBackdropContent: { paddingTop: spacing.sm },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedServicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  selectedChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  serviceItemNameOverlay: { fontSize: 16, fontWeight: '600', color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  serviceItemDurationOverlay: { fontSize: 13, color: 'rgba(255,255,255,0.95)', marginTop: 2 },
  serviceItemPlaceholder: { padding: spacing.md, borderRadius: borderRadius.lg },
  serviceItemName: { fontSize: 16, fontWeight: '600' },
  serviceItemMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  serviceItemDuration: { fontSize: 13 },
  stepContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  selectedLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedValue: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  calendar: { marginTop: spacing.md, borderRadius: borderRadius.lg },
  noSlots: { textAlign: 'center', marginTop: spacing.xl, fontSize: 15 },
  availabilityError: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  slotChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  slotText: { fontSize: 15, fontWeight: '500' },
  slotHint: { fontSize: 10, marginTop: 2 },
  reviewTitle: { fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewLabel: { fontSize: 14 },
  reviewValue: { fontSize: 14, fontWeight: '500' },
  notesLabel: { fontSize: 14, fontWeight: '500', marginBottom: spacing.xs },
  notesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 80,
  },
  loyaltyInput: {
    flex: 0,
    width: 80,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
  },
});
