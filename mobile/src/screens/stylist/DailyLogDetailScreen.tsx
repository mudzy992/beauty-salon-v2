import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api, { getUploadUrl } from '../../services/api';
import { spacing } from '../../theme';
import { formatDate } from '../../utils/date';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import type { DailyLogEntry } from '../../types';
import { getCollectedTotal, getSettledDebtsSum } from './daily-log-display';
import { DailyLogDispositionPanel } from './DailyLogDispositionPanel';

type DailyLogDetailScreenProps = {
  route: { params: { entryId: string } };
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: any) => void;
  };
};

export function DailyLogDetailScreen({ route, navigation }: DailyLogDetailScreenProps) {
  const { entryId } = route.params;
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [entry, setEntry] = useState<DailyLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const fetchEntry = useCallback(async () => {
    try {
      const { data } = await api.get<DailyLogEntry>(`/api/daily-log/${entryId}`);
      setEntry(data);
    } catch {
      setEntry(null);
    }
    setLoading(false);
  }, [entryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  useReservationSocketRefresh(fetchEntry);

  const handleComplete = useCallback(() => {
    Alert.alert(
      'Završi zapis',
      entry?.reservationId
        ? 'Označiti zapis kao završen? Ovo će završiti i rezervaciju, te upisati prihod u knjigu.'
        : 'Označiti zapis kao završen? Prihod će biti upisan u knjigu.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Završi',
          onPress: async () => {
            setActing(true);
            try {
              const reservationId = entry?.reservationId ?? null;
              await api.post(`/api/daily-log/${entryId}/complete`);
              await fetchEntry();

              if (reservationId) {
                try {
                  const { data } = await api.post<{
                    delayMinutes: number;
                    overrunMinutes?: number;
                    items: unknown[];
                  }>(`/api/reservations/${reservationId}/reschedule/propose`, {
                    includeBreaks: false,
                    mode: 'actual_overrun',
                  });
                  const delay = data?.delayMinutes ?? 0;
                  const itemCount = data?.items?.length ?? 0;
                  const overrunLabel = data?.overrunMinutes ?? delay;
                  if (delay > 0 && itemCount > 0) {
                    Alert.alert(
                      'Kašnjenje termina',
                      'Želiš li rekalkulaciju budućih termina i preview novog rasporeda?',
                      [
                        { text: 'Ne sada', style: 'cancel' },
                        {
                          text: 'Bez pauza',
                          onPress: () =>
                            navigation.navigate('ReschedulePreview', {
                              reservationId,
                              includeBreaks: false,
                              mode: 'actual_overrun',
                              lockMode: true,
                            }),
                        },
                        {
                          text: 'Uključi pauze',
                          onPress: () =>
                            navigation.navigate('ReschedulePreview', {
                              reservationId,
                              includeBreaks: true,
                              mode: 'actual_overrun',
                              lockMode: true,
                            }),
                        },
                      ],
                    );
                  } else if (delay > 0 && itemCount === 0) {
                    Alert.alert(
                      'Kašnjenje termina',
                      `Ovaj termin je kasnio ${overrunLabel} min. Nema drugih potvrđenih termina danas za pomjeranje — rekalkulacija rasporeda nije potrebna.`,
                      [{ text: 'U redu' }],
                    );
                  }
                } catch {
                  // ignore - preview je opcionalan korak
                }
              }
            } catch (err: unknown) {
              const msg =
                err && typeof err === 'object' && 'response' in err
                  ? (err as any).response?.data?.message
                  : 'Greška.';
              Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
            } finally {
              setActing(false);
            }
          },
        },
      ],
    );
  }, [entryId, fetchEntry, entry?.reservationId, navigation]);

  const handleDelete = useCallback(() => {
    setDeleteReason('');
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    const reason = deleteReason.trim();
    if (!reason) {
      Alert.alert('Greška', 'Unesite razlog brisanja.');
      return;
    }
    setActing(true);
    try {
      await api.delete(`/api/daily-log/${entryId}`, { data: { reason } });
      setDeleteModalOpen(false);
      navigation.goBack();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data
              ?.message
          : 'Greška pri brisanju.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setActing(false);
    }
  }, [deleteReason, entryId, navigation]);

  const addImage = useCallback(
    async (isBefore: boolean) => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Potrebna je dozvola za pristup galeriji.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: 'daily-log.jpg',
          type: 'image/jpeg',
        } as any);
        formData.append('entity', 'daily-log');
        const { data: uploadResult } = await api.post<{ id: string }>('/api/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await api.post(`/api/daily-log/${entryId}/images`, {
          uploadId: uploadResult.id,
          isBefore,
          isAfter: !isBefore,
        });
        await fetchEntry();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : 'Greška pri uploadu.';
        Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setUploading(false);
      }
    },
    [entryId, fetchEntry],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Zapis nije pronađen.</Text>
        <Button title="Nazad" onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const canComplete = entry.status !== 'COMPLETED';
  const beforeImages = entry.images?.filter((i) => i.isBefore) ?? [];
  const afterImages = entry.images?.filter((i) => i.isAfter) ?? [];
  const hasBeforeAfter = beforeImages.length > 0 || afterImages.length > 0;
  const reservationStatusLabel =
    entry.reservation?.status === 'CANCELLED_BY_CLIENT' &&
    (entry.reservation?.cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
      ? 'Otkazano (nepotvrđen dolazak)'
      : entry.reservation?.status
        ? entry.reservation.status
        : null;

  return (
    <>
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {entry.publicReferenceCode ?? entry.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {formatDate(entry.date)} {entry.isManual ? '· Ručno' : '· Rezervacija'}
            </Text>
          </View>
          <Text style={[styles.statusPill, { color: entry.status === 'COMPLETED' ? colors.success : colors.warning }]}>
            {entry.status === 'COMPLETED' ? 'Završeno' : 'Na čekanju'}
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>Servisi</Text>
            {(entry.items && entry.items.length > 0
              ? entry.items
              : entry.service
                ? [{ serviceId: entry.serviceId, service: entry.service, unitPrice: entry.actualPrice }]
                : []
            ).map((it, idx) => (
              <View
                key={`${it.serviceId ?? idx}`}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {it.service?.name ?? 'Usluga'}
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  {Number(it.unitPrice ?? 0).toFixed(2)} KM
                </Text>
              </View>
            ))}
          </View>

          {(entry.debtPaymentEntries?.length ?? 0) > 0 ? (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>
                Naplata dugovanja
              </Text>
              {entry.debtPaymentEntries!.map((dp) => (
                <View
                  key={dp.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, flex: 1 }}>
                    {dp.debt?.service?.name ?? dp.service?.name ?? 'Dug'}
                    {dp.debt?.createdAt
                      ? ` · ${String(dp.debt.createdAt).slice(0, 10)}`
                      : ''}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {Number(dp.actualPrice).toFixed(2)} KM
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {entry.reservation ? (
            <View style={styles.infoItem}>
              <Ionicons name="bookmark-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Rezervacija:{' '}
                <Text style={{ color: colors.text }}>
                  {reservationStatusLabel}
                </Text>
                {entry.reservation.publicReferenceCode ? ` · ${entry.reservation.publicReferenceCode}` : ''}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {entry.client ? `${entry.client.firstName} ${entry.client.lastName}` : '—'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Ukupno naplaćeno: {getCollectedTotal(entry).toFixed(2)} KM
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Servisi: {Number(entry.actualPrice).toFixed(2)} KM
            {entry.tipAmount > 0 ? ` (napojnica ${Number(entry.tipAmount).toFixed(2)} KM)` : ''}
            {getSettledDebtsSum(entry) > 0
              ? ` · Dugovi: ${getSettledDebtsSum(entry).toFixed(2)} KM`
              : ''}
          </Text>
          {entry.notes ? (
            <View style={[styles.infoItem, { alignItems: 'flex-start' }]}>
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>
                {entry.notes}
              </Text>
            </View>
          ) : null}

          {canComplete ? (
            <>
              <Button
                title={entry.reservationId ? 'Završi zapis (završava i rezervaciju)' : 'Završi zapis (upis u knjigu)'}
                onPress={handleComplete}
                loading={acting}
                style={{ marginTop: spacing.md }}
              />
              <Button
                title="Uredi unos"
                variant="outline"
                onPress={() =>
                  navigation.navigate('DailyLogNewEntry', { entryId })
                }
                style={{ marginTop: spacing.sm }}
              />
              <Button
                title="Obriši unos"
                variant="outline"
                onPress={handleDelete}
                loading={acting}
                style={{ marginTop: spacing.sm }}
              />
            </>
          ) : (
            <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Kompletirani unos može mijenjati ili vratiti na čekanje samo administrator (web).
            </Text>
          )}
        </View>
      </Card>

      {(canComplete || hasBeforeAfter) && (
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Before / After</Text>
          {beforeImages.length > 0 && (
            <>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Prije</Text>
              <View style={styles.imageRow}>
                {beforeImages.map((img) => {
                  const uri = getUploadUrl(
                    img.upload?.pathMedium ??
                      img.upload?.pathThumb ??
                      img.upload?.pathOriginal,
                  );
                  if (!uri) return null;
                  return (
                    <Image
                      key={img.id}
                      source={{ uri }}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                  );
                })}
              </View>
            </>
          )}
          {afterImages.length > 0 && (
            <>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Poslije</Text>
              <View style={styles.imageRow}>
                {afterImages.map((img) => {
                  const uri = getUploadUrl(
                    img.upload?.pathMedium ??
                      img.upload?.pathThumb ??
                      img.upload?.pathOriginal,
                  );
                  if (!uri) return null;
                  return (
                    <Image
                      key={img.id}
                      source={{ uri }}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                  );
                })}
              </View>
            </>
          )}
          {canComplete && (
            <View style={styles.addImageRow}>
              <Button
                title="Dodaj prije"
                onPress={() => addImage(true)}
                loading={uploading}
                variant="outline"
                size="sm"
              />
              <Button
                title="Dodaj poslije"
                onPress={() => addImage(false)}
                loading={uploading}
                variant="outline"
                size="sm"
              />
            </View>
          )}
        </Card>
      )}

      <DailyLogDispositionPanel
        entry={entry}
        colors={colors}
        onDone={() => navigation.goBack()}
      />
    </ScrollView>

      <Modal visible={deleteModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Obriši unos</Text>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                Unos će biti obrisan. Ako je preko ovog unosa naplaćen dug, dug se vraća u status OPEN.
              </Text>
              <Input
                label="Razlog brisanja"
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
                placeholder="Npr. greška u unosu"
              />
              <View style={styles.modalActions}>
                <Button
                  title="Odustani"
                  variant="outline"
                  onPress={() => setDeleteModalOpen(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Obriši"
                  onPress={confirmDelete}
                  loading={acting}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', gap: 10, paddingBottom: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  statusPill: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  infoGrid: { gap: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, flexShrink: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  subLabel: { fontSize: 13, marginTop: 6, marginBottom: 4 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  addImageRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
  },
  modalCard: { padding: spacing.md, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
