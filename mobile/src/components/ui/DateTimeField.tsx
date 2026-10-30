import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { borderRadius, spacing } from '../../theme';

type Mode = 'date' | 'time';

type Props = {
  label: string;
  mode: Mode;
  value: string;
  onChange: (next: string) => void;
};

const pad = (n: number): string => String(n).padStart(2, '0');

const parseValue = (mode: Mode, value: string): Date => {
  if (mode === 'date') {
    const [y, m, d] = value.split('-').map(Number);
    if ([y, m, d].every((x) => Number.isFinite(x))) {
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
  } else {
    const [h, mi] = value.split(':').map(Number);
    if ([h, mi].every((x) => Number.isFinite(x))) {
      const d = new Date();
      d.setHours(h, mi, 0, 0);
      return d;
    }
  }
  return new Date();
};

const formatValue = (mode: Mode, date: Date): string => {
  if (mode === 'date') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const displayValue = (
  mode: Mode,
  value: string,
  placeholder: string,
  formatDate: (day: string, month: string, year: string) => string,
): string => {
  if (!value) return placeholder;
  if (mode === 'date') {
    const [y, m, d] = value.split('-');
    if (y && m && d) return formatDate(d, m, y);
  }
  return value.slice(0, 5);
};

export const DateTimeField = ({ label, mode, value, onChange }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pickerDate = useMemo(() => parseValue(mode, value), [mode, value]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') return;
    if (!selected) return;
    onChange(formatValue(mode, selected));
    if (Platform.OS === 'ios') setOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.field,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
          },
        ]}
      >
        <Text style={{ color: colors.inputText }}>
          {displayValue(
            mode,
            value,
            t(mode === 'date' ? 'common.selectDate' : 'common.selectTime'),
            (day, month, year) => t('common.dateDisplay', { day, month, year }),
          )}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={pickerDate}
          mode={mode}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '500' },
  field: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
    justifyContent: 'center',
  },
});
