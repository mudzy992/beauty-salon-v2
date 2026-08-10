import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Input } from '../../components/ui/Input';
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

export function DailyLogEntryPricingBlock({
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
}: Props) {
  return (
    <>
      {selectedServices.map((s) => (
        <View
          key={s.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{s.name}</Text>
            <Input
              label="Cijena (KM)"
              value={String(unitPrices[s.id] ?? 0)}
              onChangeText={(v) => {
                const n = parseFloat(v.replace(',', '.'));
                onUnitPriceChange(s.id, Number.isFinite(n) ? n : 0);
              }}
              keyboardType="decimal-pad"
            />
          </View>
          <TouchableOpacity
            onPress={() => onRemoveService(s.id)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              backgroundColor: colors.inputBg,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Ukloni</Text>
          </TouchableOpacity>
        </View>
      ))}

      {!editMode && openDebts.length > 0 ? (
        <View style={{ marginTop: spacing.sm, gap: 8 }}>
          <Text style={{ color: colors.textSecondary }}>
            Otvorena dugovanja: {openDebts.length} ·{' '}
            {openDebts.reduce((a, d) => a + Number(d.amount || 0), 0).toFixed(2)} KM
          </Text>
          <TouchableOpacity
            onPress={() => onSettleDebtsEnabledChange(!settleDebtsEnabled)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {settleDebtsEnabled ? '✓' : '○'} Naplati dug
            </Text>
          </TouchableOpacity>
          {settleDebtsEnabled
            ? openDebts.map((d) => {
                const selected = settledDebtIds.includes(d.id);
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => onToggleDebt(d.id)}
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ color: selected ? colors.primary : colors.textMuted }}>
                      {selected ? '✓' : '○'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '600' }}>
                        Naplata dugovanja · {d.service?.name ?? 'Usluga'} ·{' '}
                        {Number(d.amount).toFixed(2)} KM
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {String(d.createdAt).slice(0, 10)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            : null}
        </View>
      ) : null}

      <Input label="Datum" value={date} onChangeText={onDateChange} />
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
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {createDebt ? '✓' : '○'} Zavedi dug
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Input label="Napomena (opciono)" value={notes} onChangeText={onNotesChange} multiline />
    </>
  );
}
