import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { getUploadUrl } from '../../services/api';
import { spacing } from '../../theme';
import { formatDate } from '../../utils/date';
import type { DailyLogEntry } from '../../types';

type DailyLogDetailScreenProps = {
  route: { params: { entryId: string } };
  navigation: { goBack: () => void };
};

export function DailyLogDetailScreen({ route, navigation }: DailyLogDetailScreenProps) {
  const { entryId } = route.params;
  const { colors } = useTheme();
  const [entry, setEntry] = useState<DailyLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleComplete = useCallback(() => {
    Alert.alert(
      'Završi zapis',
      'Označiti zapis kao završen? Prihod će biti upisan u knjigu.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Završi',
          onPress: async () => {
            setActing(true);
            try {
              await api.post(`/api/daily-log/${entryId}/complete`);
              await fetchEntry();
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
  }, [entryId, fetchEntry]);

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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>{entry.service?.name ?? 'Usluga'}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(entry.date)}</Text>
        {entry.client && (
          <Text style={[styles.client, { color: colors.text }]}>
            Klijent: {entry.client.firstName} {entry.client.lastName}
          </Text>
        )}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {Number(entry.actualPrice).toFixed(2)} KM
          </Text>
          {entry.tipAmount > 0 && (
            <Text style={[styles.tip, { color: colors.textSecondary }]}>
              + {Number(entry.tipAmount).toFixed(2)} KM napojnica
            </Text>
          )}
        </View>
        {entry.notes && (
          <Text style={[styles.notes, { color: colors.textMuted }]}>{entry.notes}</Text>
        )}
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Status:</Text>
          <Text style={[styles.status, { color: entry.status === 'COMPLETED' ? colors.success : colors.warning }]}>
            {entry.status === 'COMPLETED' ? 'Završeno' : 'Na čekanju'}
          </Text>
        </View>
        {canComplete && (
          <Button
            title="Završi zapis (upis u knjigu)"
            onPress={handleComplete}
            loading={acting}
            style={{ marginTop: spacing.md }}
          />
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Before / After</Text>
        {beforeImages.length > 0 && (
          <>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Prije</Text>
            <View style={styles.imageRow}>
              {beforeImages.map((img) => {
                const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal);
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
                const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal);
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  date: { fontSize: 14, marginTop: 4 },
  client: { fontSize: 14, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  price: { fontSize: 18, fontWeight: '700' },
  tip: { fontSize: 14 },
  notes: { fontSize: 14, marginTop: 8, fontStyle: 'italic' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  statusLabel: { fontSize: 14 },
  status: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  subLabel: { fontSize: 13, marginTop: 6, marginBottom: 4 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  addImageRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
