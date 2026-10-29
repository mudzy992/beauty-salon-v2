import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { useTranslation } from 'react-i18next';
import { DateTimeField } from '../../components/ui/DateTimeField';
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme';
import type { OpenDebtRow } from './daily-log-entry-math';

type ThemeColors = {
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  surface: string;
};

type Props = {
  colors: ThemeColors;
  selectedServices: Array<{ id: string; name: string }>;
  unitPrices: Record<string, number>;
  onUnitPriceChange: (serviceId: string, value: number) => void;
  onRemoveService: (serviceId: string) => void;
  openDebts: OpenDebtRow[];
  settleDebtsEnabled: boolean;
  onSettleDebtsEnabledChange: (value: boolean) => void;
  settledDebtIds: string[];
  onToggleDebt: (debtId: string) => void;
  chargeAmount: number;
  servicesSum: number;
  loyaltyDiscount: number;
  debtsSum: number;
  paidAmount: string;
  onPaidAmountChange: (value: string) => void;
  tipPreview: number;
  shortfall: number;
  createDebt: boolean;
  onCreateDebtChange: (value: boolean) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  editMode: boolean;
};

export function DailyLogEntryPricingBlock(props: Props) {
  const { t } = useTranslation();
  const {
    colors,
    selectedServices,
    unitPrices,
    onUnitPriceChange,
    onRemoveService,
    openDebts,
    settleDebtsEnabled,
    onSettleDebtsEnabledChange,
    settledDebtIds,
    onToggleDebt,
    chargeAmount,
    servicesSum,
    loyaltyDiscount,
    debtsSum,
    paidAmount,
    onPaidAmountChange,
    tipPreview,
    shortfall,
    createDebt,
    onCreateDebtChange,
    notes,
    onNotesChange,
    date,
    onDateChange,
    editMode,
  } = props;
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [editPriceDraft, setEditPriceDraft] = useState('');
  const editingService = selectedServices.find((s) => s.id === editServiceId);

  const openEditPrice = (serviceId: string) => {
    setEditServiceId(serviceId);
    setEditPriceDraft(String(unitPrices[serviceId] ?? 0));
  };

  const saveEditPrice = () => {
    if (!editServiceId) return;
    const n = parseFloat(editPriceDraft.replace(',', '.'));
    onUnitPriceChange(editServiceId, Number.isFinite(n) && n >= 0 ? n : 0);
    setEditServiceId(null);
  };

  return (
    <>
      {selectedServices.map((s) => (
        <View
          key={s.id}
          style={[styles.serviceRow, { borderBottomColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{s.name}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
              {(unitPrices[s.id] ?? 0).toFixed(2)} KM
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openEditPrice(s.id)}
            accessibilityLabel={t('stylist.dailyLogDetail.editPriceAccessibilityLabel')}
            style={[styles.iconBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRemoveService(s.id)}
            accessibilityLabel={t('stylist.dailyLogDetail.removeServiceAccessibilityLabel')}
            style={[styles.iconBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ))}

      {!editMode && openDebts.length > 0 ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Text style={{ color: colors.textSecondary }}>
            {t('stylist.dailyLogDetail.openDebtsSummary', {
              count: openDebts.length,
              amount: openDebts.reduce((a, d) => a + Number(d.amount || 0), 0).toFixed(2),
            })}
          </Text>
          <TouchableOpacity
            onPress={() => onSettleDebtsEnabledChange(!settleDebtsEnabled)}
            style={[
              styles.settleBtn,
              {
                backgroundColor: settleDebtsEnabled ? colors.primary : colors.inputBg,
                borderColor: settleDebtsEnabled ? colors.primary : colors.inputBorder,
              },
            ]}
          >
            <Ionicons
              name={settleDebtsEnabled ? 'checkbox' : 'square-outline'}
              size={20}
              color={settleDebtsEnabled ? colors.primaryText : colors.primary}
            />
            <Text
              style={{
                color: settleDebtsEnabled ? colors.primaryText : colors.primary,
                fontWeight: '700',
                fontSize: 15,
              }}
            >
              {t('stylist.dailyLogDetail.settleDebtAction')}
            </Text>
          </TouchableOpacity>
          {settleDebtsEnabled ? (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {t('stylist.dailyLogDetail.selectDebtsHint')}
              </Text>
              {openDebts.map((d) => {
                const selected = settledDebtIds.includes(d.id);
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => onToggleDebt(d.id)}
                    style={[styles.debtRow, { borderBottomColor: colors.border }]}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selected ? colors.primary : colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '600' }}>
                        {d.service?.name ?? t('stylist.dailyLogDetail.serviceFallback')} · {Number(d.amount).toFixed(2)} KM
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {String(d.createdAt).slice(0, 10)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : null}
        </View>
      ) : null}

      <DateTimeField label="Datum" mode="date" value={date} onChange={onDateChange} />
      <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
        {t('stylist.dailyLogDetail.servicesAmount', { amount: servicesSum.toFixed(2) })}
        {loyaltyDiscount > 0
          ? t('stylist.dailyLogDetail.loyaltyDiscountAmount', { amount: loyaltyDiscount.toFixed(2) })
          : ''}
        {debtsSum > 0
          ? t('stylist.dailyLogDetail.debtChargeAmount', { amount: debtsSum.toFixed(2) })
          : ''}
      </Text>
      <Text style={{ color: colors.text, marginTop: 2, fontWeight: '700' }}>
        {t('stylist.dailyLogDetail.totalDueAmount', { amount: chargeAmount.toFixed(2) })}
      </Text>
      <Input
        label={t('stylist.dailyLogDetail.paidAmountLabel')}
        value={paidAmount}
        onChangeText={onPaidAmountChange}
        keyboardType="decimal-pad"
        placeholder={chargeAmount > 0 ? chargeAmount.toFixed(2) : '0.00'}
      />
      {tipPreview > 0 ? (
        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
          {t('stylist.dailyLogDetail.tipPreviewAmount', { amount: tipPreview.toFixed(2) })}
        </Text>
      ) : null}
      {shortfall > 0 ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={{ color: colors.textSecondary }}>
            {t('stylist.dailyLogDetail.shortfallPreviewAmount', { amount: shortfall.toFixed(2) })}
          </Text>
          <TouchableOpacity
            onPress={() => onCreateDebtChange(!createDebt)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Ionicons
              name={createDebt ? 'checkbox' : 'square-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('stylist.dailyLogDetail.createDebtToggle')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Input label="Napomena (opciono)" value={notes} onChangeText={onNotesChange} multiline />

      <Modal visible={!!editServiceId} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('stylist.dailyLogDetail.priceEditTitle')}</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
              {t('stylist.dailyLogDetail.priceEditDescription')}
            </Text>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>
              {editingService?.name ?? t('stylist.dailyLogDetail.priceEditServiceFallback')}
            </Text>
            <Input
              label={t('stylist.dailyLogDetail.priceLabel')}
              value={editPriceDraft}
              onChangeText={setEditPriceDraft}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <Button title={t('common.cancel')} variant="outline" onPress={() => setEditServiceId(null)} style={{ flex: 1 }} />
              <Button title={t('common.save')} onPress={saveEditPrice} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
  },
  modalCard: { borderRadius: 12, padding: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
