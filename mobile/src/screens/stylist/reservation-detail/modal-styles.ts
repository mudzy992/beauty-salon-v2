import { StyleSheet } from 'react-native';
import { spacing } from '../../../theme';

export const reservationDetailModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
  },
  contentWrap: { maxHeight: '80%' },
  card: { padding: spacing.lg },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  btn: { flex: 1 },
  infoText: { fontSize: 14, flexShrink: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  debtTitle: { fontSize: 14, fontWeight: '700' },
  debtMeta: { fontSize: 12, marginTop: 2 },
});
