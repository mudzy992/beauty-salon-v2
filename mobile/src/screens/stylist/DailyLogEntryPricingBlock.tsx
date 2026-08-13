import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { DateTimeField } from '../../components/ui/DateTimeField';
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme';
import type { OpenDebtRow } from './daily-log-entry-math';

type ThemeColors = {
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
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
            accessibilityLabel="Uredi cijenu"
            style={[styles.iconBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRemoveService(s.id)}
            accessibilityLabel="Ukloni servis"
            style={[styles.iconBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ))}

      {!editMode && openDebts.length > 0 ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Text style={{ color: colors.textSecondary }}>
            Otvorena dugovanja: {openDebts.length} ·{' '}
            {openDebts.reduce((a, d) => a + Number(d.amount || 0), 0).toFixed(2)} KM
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
              color={settleDebtsEnabled ? '#fff' : colors.primary}
            />
            <Text
              style={{
                color: settleDebtsEnabled ? '#fff' : colors.primary,
                fontWeight: '700',
                fontSize: 15,
              }}
            >
              Naplati dug
            </Text>
          </TouchableOpacity>
          {settleDebtsEnabled ? (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                Označite dugovanja za naplatu
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
                        {d.service?.name ?? 'Usluga'} · {Number(d.amount).toFixed(2)} KM
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
        Servisi: {servicesSum.toFixed(2)} KM
        {loyaltyDiscount > 0 ? ` − loyalty ${loyaltyDiscount.toFixed(2)} KM` : ''}
        {debtsSum > 0 ? ` + dugovi ${debtsSum.toFixed(2)} KM` : ''}
      </Text>
      <Text style={{ color: colors.text, marginTop: 2, fontWeight: '700' }}>
        Za naplatu: {chargeAmount.toFixed(2)} KM
      </Text>
      <Input
        label="Naplaćeno (KM)"
        value={paidAmount}
        onChangeText={onPaidAmountChange}
        keyboardType="decimal-pad"
        placeholder={chargeAmount > 0 ? chargeAmount.toFixed(2) : '0.00'}
      />
      {tipPreview > 0 ? (
        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
          Napojnica: {tipPreview.toFixed(2)} KM
        </Text>
      ) : null}
      {shortfall > 0 ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={{ color: colors.textSecondary }}>
            Dug (preview): {shortfall.toFixed(2)} KM
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
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Zavedi dug</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Input label="Napomena (opciono)" value={notes} onChangeText={onNotesChange} multiline />

      <Modal visible={!!editServiceId} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Uredi cijenu</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
              Cijena vrijedi samo za ovaj unos (snapshot). Katalog ostaje nepromijenjen.
            </Text>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>
              {editingService?.name ?? 'Servis'}
            </Text>
            <Input
              label="Cijena (KM)"
              value={editPriceDraft}
              onChangeText={setEditPriceDraft}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <Button title="Odustani" variant="outline" onPress={() => setEditServiceId(null)} style={{ flex: 1 }} />
              <Button title="Sačuvaj" onPress={saveEditPrice} style={{ flex: 1 }} />
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
