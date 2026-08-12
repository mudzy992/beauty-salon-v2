import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme';
import type { ClientDebt, Reservation } from '../../../types';
import { reservationDetailModalStyles as styles } from './modal-styles';
import { ReservationDetailModalShell } from './reservation-detail-modal-shell';

type CompleteReservationModalProps = {
  visible: boolean;
  reservation: Reservation;
  profileId?: string;
  actualPrice: string;
  notes: string;
  createDebt: boolean;
  submitting: boolean;
  clientDebts: ClientDebt[];
  clientDebtsLoading: boolean;
  selectedDebtIds: Record<string, boolean>;
  completeChargeAmount: number;
  selectedDebtSum: number;
  onActualPriceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onToggleCreateDebt: () => void;
  onToggleDebt: (debtId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CompleteReservationModal({
  visible,
  reservation,
  profileId,
  actualPrice,
  notes,
  createDebt,
  submitting,
  clientDebts,
  clientDebtsLoading,
  selectedDebtIds,
  completeChargeAmount,
  selectedDebtSum,
  onActualPriceChange,
  onNotesChange,
  onToggleCreateDebt,
  onToggleDebt,
  onClose,
  onSubmit,
}: CompleteReservationModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const paidRaw = parseFloat(actualPrice.replace(',', '.')) || 0;
  const tipAmount = Math.max(0, paidRaw - completeChargeAmount);
  const shortfall = Math.max(0, completeChargeAmount - paidRaw);

  return (
    <ReservationDetailModalShell visible={visible}>
      <Text style={[styles.title, { color: colors.text }]}>{t('stylist.schedule.completeTitle')}</Text>
      <Input
        label="Naplaćeno (KM)"
        value={actualPrice}
        onChangeText={onActualPriceChange}
        keyboardType="decimal-pad"
      />
      <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 4 }]}>
        Za naplatu: {completeChargeAmount.toFixed(2)} KM
        {reservation.payDebtsIntent ? ' · klijent želi platiti dug' : ''}
      </Text>
      {tipAmount > 0 ? (
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Napojnica: {tipAmount.toFixed(2)} KM
        </Text>
      ) : null}
      {shortfall > 0 ? (
        <TouchableOpacity
          onPress={onToggleCreateDebt}
          style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {createDebt ? '✓' : '○'} Zavedi dug ({shortfall.toFixed(2)} KM)
          </Text>
        </TouchableOpacity>
      ) : null}
      <View style={{ marginTop: spacing.sm }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Dugovanja klijenta</Text>
        {clientDebtsLoading ? (
          <View style={{ paddingVertical: spacing.sm }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : clientDebts.length === 0 ? (
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Nema otvorenih dugovanja.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {clientDebts.slice(0, 6).map((d) => {
              const isMine = d.stylistProfileId === profileId;
              const label = d.service?.name ?? 'Usluga';
              const stylistName = d.stylistProfile?.user
                ? `${d.stylistProfile.user.firstName} ${d.stylistProfile.user.lastName}`.trim()
                : 'Stilist';
              const selected = !!selectedDebtIds[d.id];
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => onToggleDebt(d.id)}
                  style={[styles.debtRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Ionicons
                    name={selected ? 'checkbox-outline' : 'square-outline'}
                    size={18}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.debtTitle, { color: colors.text }]}>
                      {label} · {Number(d.amount).toFixed(2)} KM
                    </Text>
                    <Text style={[styles.debtMeta, { color: colors.textSecondary }]}>
                      {isMine ? 'Dug kod vas' : `Dug kod ${stylistName}`} · {d.createdAt.slice(0, 10)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Odabrana dugovanja će biti dodata na ukupnu cijenu i neće se računati u napojnicu.
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Ukupno za dugovanja: {selectedDebtSum.toFixed(2)} KM
            </Text>
          </View>
        )}
      </View>
      <Input label="Napomena (opciono)" value={notes} onChangeText={onNotesChange} multiline />
      <View style={styles.actions}>
        <Button title={t('common.cancel')} onPress={onClose} variant="outline" style={styles.btn} />
        <Button
          title={t('stylist.schedule.completeSubmit')}
          onPress={onSubmit}
          loading={submitting}
          style={styles.btn}
        />
      </View>
    </ReservationDetailModalShell>
  );
}
