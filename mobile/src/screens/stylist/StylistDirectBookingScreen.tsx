import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DateTimeField } from '../../components/ui/DateTimeField';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../hooks/useTheme';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { spacing } from '../../theme';
import { DirectBookingPickers } from './direct-booking-pickers';
import { useStylistDirectBookingForm } from './use-stylist-direct-booking-form';

export function StylistDirectBookingScreen({
  navigation,
}: {
  navigation: { goBack: () => void };
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const form = useStylistDirectBookingForm(() => navigation.goBack());

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('stylist.directBooking.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('stylist.directBooking.subtitle')}
          </Text>
          <Input
            label="Klijent"
            value={form.clientSearch}
            onChangeText={form.handleClientSearchChange}
            placeholder="Pretraži klijenta..."
          />
          <DirectBookingPickers
            colors={colors}
            clients={form.clients}
            selectedClient={form.selectedClient}
            filteredServices={form.filteredServices}
            serviceIds={form.serviceIds}
            onSelectClient={form.handleSelectClient}
            onToggleServiceId={form.handleToggleServiceId}
          />
          <DateTimeField
            label="Datum"
            mode="date"
            value={form.reservationDate}
            onChange={form.setReservationDate}
          />
          <DateTimeField label="Početak" mode="time" value={form.startTime} onChange={form.setStartTime} />
          <DateTimeField label="Kraj" mode="time" value={form.endTime} onChange={form.setEndTime} />
          <Input
            label="Napomena"
            value={form.clientNotes}
            onChangeText={form.setClientNotes}
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <View style={styles.actions}>
            <Button title="Odustani" variant="ghost" onPress={() => navigation.goBack()} />
            <Button
              title="Kreiraj termin"
              onPress={form.handleSubmit}
              loading={form.saving}
              disabled={
                !form.selectedClient ||
                !form.selectedClient.gender ||
                form.serviceIds.length === 0 ||
                !form.reservationDate ||
                !form.startTime ||
                !form.endTime
              }
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  card: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
