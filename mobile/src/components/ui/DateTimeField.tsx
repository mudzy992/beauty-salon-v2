import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { borderRadius, spacing } from '../../theme';
import {
  displayDateTimeFieldValue,
  formatDateTimeFieldValue,
  parseDateTimeFieldValue,
} from './date-time-field-value.mjs';

type Mode = 'date' | 'time';

type Props = {
  label: string;
  mode: Mode;
  value: string;
  onChange: (next: string) => void;
};

export const DateTimeField = ({ label, mode, value, onChange }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pickerDate = useMemo(() => parseDateTimeFieldValue(mode, value), [mode, value]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') return;
    if (!selected) return;
    onChange(formatDateTimeFieldValue(mode, selected));
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
          {displayDateTimeFieldValue(
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
