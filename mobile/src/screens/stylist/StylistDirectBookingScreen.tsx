import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
            label={t('stylist.directBooking.clientLabel')}
            value={form.clientSearch}
            onChangeText={form.handleClientSearchChange}
            placeholder={t('stylist.directBooking.clientPlaceholder')}
          />
          {form.clientSearchLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
          {!form.clientSearchLoading &&
          !form.clientSearchLoadError &&
          form.clientSearch.trim().length > 0 &&
          form.clients.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('common.noResults')}</Text>
          ) : null}
          {form.clientSearchLoadError ? (
            <View style={styles.recoveryNotice}>
              <Text style={{ color: colors.textSecondary }}>
                {t('stylist.directBooking.clientSearchLoadError')}
              </Text>
              <Button
                title={t('common.retry')}
                variant="outline"
                onPress={form.handleRetryClientSearch}
              />
            </View>
          ) : null}
          {form.servicesLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          {form.servicesLoadError ? (
            <View style={styles.recoveryNotice}>
              <Text style={{ color: colors.textSecondary }}>
                {t(form.servicesHaveData ? 'services.staleMessage' : 'services.loadErrorMessage')}
              </Text>
              <Button title={t('common.retry')} variant="outline" onPress={form.retryServices} />
            </View>
          ) : null}
          <DirectBookingPickers
            colors={colors}
            clients={form.clients}
            selectedClient={form.selectedClient}
            filteredServices={form.filteredServices}
            servicesLoading={form.servicesLoading}
            servicesLoadError={form.servicesLoadError}
            serviceIds={form.serviceIds}
            onSelectClient={form.handleSelectClient}
            onToggleServiceId={form.handleToggleServiceId}
          />
          <DateTimeField
            label={t('stylist.directBooking.dateLabel')}
            mode="date"
            value={form.reservationDate}
            onChange={form.setReservationDate}
          />
          <DateTimeField
            label={t('stylist.directBooking.startLabel')}
            mode="time"
            value={form.startTime}
            onChange={form.setStartTime}
          />
          <DateTimeField
            label={t('stylist.directBooking.endLabel')}
            mode="time"
            value={form.endTime}
            onChange={form.setEndTime}
          />
          <Input
            label={t('stylist.directBooking.notesLabel')}
            value={form.clientNotes}
            onChangeText={form.setClientNotes}
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <View style={styles.actions}>
            <Button
              title={t('stylist.directBooking.cancel')}
              variant="ghost"
              onPress={() => navigation.goBack()}
            />
            <Button
              title={t('stylist.directBooking.submit')}
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
  recoveryNotice: { gap: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
