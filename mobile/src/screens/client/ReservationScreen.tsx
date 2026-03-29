import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ImageBackground,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { getUploadUrl } from '../../services/api';
import { spacing, borderRadius } from '../../theme';
import { formatDate, formatTime, getDateRange } from '../../utils/date';
import type { ServicesScreenProps } from '../../navigation/types';
import type { Service, AvailableDate, TimeSlot } from '../../types';

type Step = 1 | 2 | 3 | 4;

type LoyaltyInfo = {
  enabled: boolean;
  hasAccount: boolean;
  redeemEnabled?: boolean;
  points?: number;
  tier?: string | null;
  tierMaxDiscountPercent?: number;
  globalMaxDiscountPercent?: number;
  minPointsToRedeem?: number;
  service?: {
    id: string;
    price: number;
    maxDiscountPercent: number;
    maxDiscountAmount: number;
    maxUsablePoints: number;
  } | null;
};

export function ReservationScreen({ route, navigation }: ServicesScreenProps<'Reservation'>) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const user = useAuthStore((state) => state.user);
  const initialServiceId = route.params?.serviceId;
  const origin = route.params?.origin;
  const requestId = route.params?.requestId;
  const originCategoryId = route.params?.originCategoryId;
  const originCategoryName = route.params?.originCategoryName;

  const [step, setStep] = useState<Step>(initialServiceId ? 2 : 1);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [availableDates, setAvailableDates] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState<number>(0);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const servicesById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );

  // Load all services for step 1
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Service[]>('/api/services', {
          params: { activeOnly: true },
        });
        setServices(Array.isArray(data) ? data : []);
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
      setSelectedService(fromList);
      setSelectedDate(null);
      setSelectedSlot(null);
      setNotes('');
      setDesiredLoyaltyPercent(0);
      setLoyaltyInfo(null);
      setStep(2);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get<Service>(`/api/services/${initialServiceId}`);
        if (user?.gender && data.gender !== user.gender) {
          setStep(1);
          return;
        }
        setSelectedService(data);
        setSelectedDate(null);
        setSelectedSlot(null);
        setNotes('');
        setDesiredLoyaltyPercent(0);
        setLoyaltyInfo(null);
        setStep(2);
      } catch {
        setStep(1);
      }
    })();
  }, [initialServiceId, requestId, servicesById, user?.gender]);

  // Load available dates when service is selected
  useEffect(() => {
    if (!selectedService) return;
    setLoading(true);
    const { fromDate, toDate } = getDateRange(60);
    (async () => {
      try {
        const { data } = await api.get<AvailableDate[]>('/api/reservations/availability/dates', {
          params: { serviceId: selectedService.id, fromDate, toDate },
        });
        const dateMap: Record<string, boolean> = {};
        data.forEach((d) => { dateMap[d.date] = d.available; });
        setAvailableDates(dateMap);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [selectedService]);

  // Load slots when date is selected
  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get<TimeSlot[]>('/api/reservations/availability/slots', {
          params: { serviceId: selectedService.id, date: selectedDate },
        });
        setSlots(data);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [selectedService, selectedDate]);

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

  const handleSelectService = useCallback((service: Service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(2);
  }, []);

  const handleSelectDate = useCallback((day: DateData) => {
    if (availableDates[day.dateString]) {
      setSelectedDate(day.dateString);
      setSelectedSlot(null);
      setStep(3);
    }
  }, [availableDates]);

  const handleSelectSlot = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep(4);
    setDesiredLoyaltyPercent(0);
    if (selectedService) {
      (async () => {
        try {
          const { data } = await api.get<LoyaltyInfo>('/api/loyalty/client/me', {
            params: { serviceId: selectedService.id },
          });
          setLoyaltyInfo(data);
        } catch {
          setLoyaltyInfo(null);
        }
      })();
    } else {
      setLoyaltyInfo(null);
    }
  }, [selectedService]);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
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
    try {
      await api.post('/api/reservations', {
        serviceId: selectedService.id,
        reservationDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        clientNotes: notes.trim() || undefined,
        ...(desiredLoyaltyPercent > 0 ? { desiredLoyaltyPercent } : {}),
      });
      Alert.alert(t('reservation.success'), t('reservation.successMessage'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.getParent()?.navigate('ReservationsTab'),
        },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Greška pri kreiranju rezervacije';
      Alert.alert(t('common.error'), typeof msg === 'string' ? msg : 'Greška');
    }
    setSubmitting(false);
  };

  const handleBackFromDateStep = useCallback(() => {
    switch (origin) {
      case 'home':
        navigation.getParent()?.navigate('HomeTab', { screen: 'Home' });
        return;
      case 'services-list':
        navigation.getParent()?.navigate('ServicesTab', { screen: 'Services' });
        return;
      case 'service-detail':
        if (originCategoryId && originCategoryName) {
          navigation.navigate('ServiceDetail', {
            categoryId: originCategoryId,
            categoryName: originCategoryName,
          });
          return;
        }
        navigation.getParent()?.navigate('ServicesTab', { screen: 'Services' });
        return;
      case 'service-single':
        if (selectedService) {
          navigation.navigate('ServiceSingleDetail', {
            serviceId: selectedService.id,
            serviceName: selectedService.name,
          });
          return;
        }
        navigation.getParent()?.navigate('ServicesTab', { screen: 'Services' });
        return;
      case 'reservations':
        navigation.getParent()?.navigate('ReservationsTab', { screen: 'MyReservations' });
        return;
      default:
        setStep(1);
        setSelectedService(null);
    }
  }, [navigation, origin, originCategoryId, originCategoryName, selectedService]);

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
              return (
                <Card onPress={() => handleSelectService(item)} style={[styles.serviceItem, styles.serviceItemBackdrop]} padded={false}>
                  {heroUri ? (
                    <ImageBackground
                      source={{ uri: heroUri }}
                      style={styles.serviceItemBackdropImage}
                      imageStyle={styles.serviceItemBackdropImageStyle}
                    >
                      <View style={[styles.serviceItemBackdropOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                      <View style={styles.serviceItemBackdropContent}>
                        <Text style={styles.serviceItemNameOverlay}>{item.name}</Text>
                        <Text style={styles.serviceItemDurationOverlay}>{item.durationMinutes} min</Text>
                      </View>
                    </ImageBackground>
                  ) : (
                    <View style={[styles.serviceItemPlaceholder, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.serviceItemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.serviceItemDuration, { color: colors.textSecondary }]}>
                        {item.durationMinutes} min
                      </Text>
                    </View>
                  )}
                </Card>
              );
            }}
          />
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
            <Text style={[styles.selectedValue, { color: colors.text }]}>
              {selectedService?.name}
            </Text>
          </Card>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <Calendar
              onDayPress={handleSelectDate}
              markedDates={markedDates}
              minDate={new Date().toISOString().split('T')[0]}
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
            onPress={handleBackFromDateStep}
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
              {selectedService?.name}
            </Text>
            <Text style={[styles.selectedLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {t('reservation.date')}
            </Text>
            <Text style={[styles.selectedValue, { color: colors.text }]}>
              {selectedDate ? formatDate(selectedDate) : ''}
            </Text>
          </Card>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : slots.length === 0 ? (
            <Text style={[styles.noSlots, { color: colors.textSecondary }]}>
              {t('reservation.noSlots')}
            </Text>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                const now = new Date();
                const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const isPastSlot = selectedDate === todayLocal && slot.startTime.slice(0, 5) < nowHHMM;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => !isPastSlot && handleSelectSlot(slot)}
                    disabled={isPastSlot}
                    style={[
                      styles.slotChip,
                      {
                        backgroundColor: isPastSlot
                          ? colors.background
                          : isSelected
                            ? colors.primary
                            : colors.surface,
                        borderColor: isPastSlot
                          ? colors.border
                          : isSelected
                            ? colors.primary
                            : colors.border,
                        opacity: isPastSlot ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        { color: isSelected ? colors.primaryText : colors.text },
                      ]}
                    >
                      {formatTime(slot.startTime)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Button
            title={t('common.back')}
            onPress={() => { setStep(2); setSelectedDate(null); }}
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
                {selectedService?.name}
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
            onPress={() => { setStep(3); setSelectedSlot(null); }}
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
