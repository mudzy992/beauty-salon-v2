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
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { getUploadUrl } from '../../services/api';
import { spacing, borderRadius } from '../../theme';
import { formatDate, formatTime, getDateRange } from '../../utils/date';
import type { ServicesScreenProps } from '../../navigation/types';
import type { Service, ServiceCategory, AvailableDate, TimeSlot } from '../../types';

type Step = 1 | 2 | 3 | 4;

export function ReservationScreen({ route, navigation }: ServicesScreenProps<'Reservation'>) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const initialServiceId = route.params?.serviceId;

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

  // Load all services for step 1
  useEffect(() => {
    if (initialServiceId) {
      (async () => {
        try {
          const { data } = await api.get<Service>(`/api/services/${initialServiceId}`);
          setSelectedService(data);
        } catch { /* silent */ }
      })();
    }

    (async () => {
      try {
        const { data: categories } = await api.get<ServiceCategory[]>(
          '/api/services/categories',
          { params: { activeOnly: true } },
        );
        const all: Service[] = [];
        for (const cat of categories) {
          try {
            const { data } = await api.get<ServiceCategory>(`/api/services/categories/${cat.id}`);
            data.subcategories?.forEach((sub) => {
              sub.services?.forEach((s) => all.push(s));
            });
          } catch { /* skip */ }
        }
        setServices(all);
      } catch { /* silent */ }
    })();
  }, [initialServiceId]);

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
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.shortDescription?.toLowerCase().includes(q),
    );
  }, [services, searchQuery]);

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
  }, []);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
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
            contentContainerStyle={styles.listContent}
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
        <ScrollView contentContainerStyle={styles.stepContent}>
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
              }}
              style={styles.calendar}
            />
          )}

          <Button
            title={t('common.back')}
            onPress={() => { setStep(1); setSelectedService(null); }}
            variant="ghost"
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      )}

      {/* Step 3: Select Time Slot */}
      {step === 3 && (
        <ScrollView contentContainerStyle={styles.stepContent}>
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
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectSlot(slot)}
                    style={[
                      styles.slotChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
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
        <ScrollView contentContainerStyle={styles.stepContent}>
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

          <Card style={{ marginBottom: spacing.md }}>
            <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>
              Loyalty popust (opciono)
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm }}>
              Ako imate dovoljno loyalty bodova, možete odabrati procenat popusta koji želite iskoristiti za ovu
              rezervaciju. Maksimalni dozvoljeni procenat ovisit će o vašem nivou i postavkama salona – backend će
              odbiti zahtjev ako je prevelik.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
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
                    setDesiredLoyaltyPercent(Math.min(100, n));
                  }
                }}
              />
              <Text style={{ color: colors.textSecondary }}>%</Text>
            </View>
          </Card>

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
  serviceItemBackdropOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: borderRadius.lg },
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
