import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Card } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import api, { getUploadUrl } from '../../services/api';
import { spacing } from '../../theme';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from '../../utils/date';
import type { Reservation, DailyLogEntry } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { StylistScheduleStackParamList } from '../../navigation/types';

type Section = { title: string; data: Reservation[] };

type Props = NativeStackScreenProps<StylistScheduleStackParamList, 'ScheduleList'>;

export function StylistScheduleScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const gold = '#D4AF37';
  const { profileId, loading: profileLoading } = useStylistProfile();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    try {
      const from = new Date();
      // Fokus: od danas nadalje (nema potrebe prikazivati prošle rezervacije na rasporedu)
      from.setHours(0, 0, 0, 0);
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const { data } = await api.get<Reservation[]>('/api/reservations', {
        params: {
          asStylist: true,
          fromDate: from.toISOString().slice(0, 10),
          toDate: to.toISOString().slice(0, 10),
        },
      });
      const filtered = (Array.isArray(data) ? data : []).filter(
        (r) =>
          r.status !== 'CANCELLED_BY_CLIENT' && r.status !== 'CANCELLED_BY_STYLISTS',
      );
      setReservations(filtered.filter((r) => r.status !== 'COMPLETED'));
    } catch {
      setReservations([]);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useAutoRefresh(fetchReservations, { intervalMs: 30000 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  }, [fetchReservations]);

  const sections: Section[] = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const today: Reservation[] = [];
    const futureByDate: Record<string, Reservation[]> = {};

    for (const r of reservations) {
      const d = r.reservationDate.slice(0, 10);
      if (d === todayStr) today.push(r);
      else if (d > todayStr) {
        if (!futureByDate[d]) futureByDate[d] = [];
        futureByDate[d].push(r);
      }
    }

    const statusOrder: Record<string, number> = {
      IN_PROGRESS: 0,
      ATTENDANCE_CONFIRMED: 1,
      CONFIRMED: 2,
      STYLIST_REVIEW: 3,
      PENDING: 4,
      COMPLETED: 5,
      CANCELLED_BY_CLIENT: 6,
      CANCELLED_BY_STYLISTS: 7,
      NO_SHOW: 8,
    };

    const sortFn = (a: Reservation, b: Reservation) => {
      const ao = statusOrder[a.status] ?? 99;
      const bo = statusOrder[b.status] ?? 99;
      if (ao !== bo) return ao - bo;
      if (a.reservationDate !== b.reservationDate)
        return a.reservationDate < b.reservationDate ? -1 : 1;
      return a.startTime < b.startTime ? -1 : 1;
    };

    today.sort(sortFn);
    Object.values(futureByDate).forEach((arr) => arr.sort(sortFn));

    const dayAbbrev = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
      const map = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
      return map[dt.getDay()] ?? '';
    };

    const result: Section[] = [];
    result.push({ title: 'Danas', data: today });
    const sortedFutureDates = Object.keys(futureByDate).sort();
    for (const dateStr of sortedFutureDates) {
      result.push({
        title: `${dayAbbrev(dateStr)} · ${formatDate(dateStr)}`,
        data: futureByDate[dateStr],
      });
    }
    return result;
  }, [reservations]);

  const activeReservation = React.useMemo(() => {
    return (
      reservations.find(
        (r) => r.status === 'IN_PROGRESS' && r.confirmedStylistId === profileId,
      ) ?? null
    );
  }, [reservations, profileId]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const activeTimeText = useMemo(() => {
    if (!activeReservation) return null;
    const dateStr = activeReservation.reservationDate.slice(0, 10);
    const [y, m, d] = dateStr.split('-').map(Number);
    const [eh, em] = activeReservation.endTime.slice(0, 5).split(':').map(Number);
    const end = new Date(y, (m ?? 1) - 1, d ?? 1, eh ?? 0, em ?? 0, 0, 0);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const sign = diffMs >= 0 ? '' : '+';
    const abs = Math.abs(diffMs);
    const totalSec = Math.floor(abs / 1000);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;
    const hh = Math.floor(totalSec / 3600);
    const core = hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
    return diffMs >= 0 ? `Do kraja: ${core}` : `Prekoračenje: ${sign}${core}`;
  }, [activeReservation, tick]);

  const activeHeroUri = useMemo(() => {
    const path = activeReservation?.service?.heroImage;
    const uri = path ? getUploadUrl(path) : null;
    return uri || null;
  }, [activeReservation]);

  if (profileLoading || (loading && !profileId)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profileId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="calendar-outline"
          title="Nema profila"
          message="Profil stilista nije pronađen."
        />
      </View>
    );
  }

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          sections.length === 0 && styles.emptyList,
          { paddingBottom: spacing.lg + insets.bottom + 8 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          activeReservation ? (
            <Card style={[styles.activeCard, { backgroundColor: colors.card }]} padded={false}>
              {activeHeroUri ? (
                <ImageBackground
                  source={{ uri: activeHeroUri }}
                  style={styles.cardBackdropImage}
                  imageStyle={styles.cardBackdropImageStyle}
                  resizeMode="cover"
                >
                  <View
                    style={[
                      styles.cardBackdropOverlay,
                      { backgroundColor: 'rgba(0,0,0,0.42)' },
                    ]}
                  />

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.activeContent, styles.activeBackdropContent]}
                    onPress={() =>
                      navigation.navigate('StylistReservationDetail', {
                        reservationId: activeReservation.id,
                      })
                    }
                  >
                    <View style={styles.activeHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activeTitle, styles.titleOverlay]}>
                          Aktivna rezervacija
                        </Text>
                        <Text style={[styles.activeTimeRange, styles.subtleOverlay]}>
                          {formatTime(activeReservation.startTime)} –{' '}
                          {formatTime(activeReservation.endTime)}
                        </Text>
                      </View>
                      <Badge
                        label={t(`myReservations.status.${activeReservation.status}` as any)}
                        variant={getStatusVariant(activeReservation.status)}
                        status={activeReservation.status}
                      />
                    </View>

                    {activeTimeText ? (
                      <Text style={[styles.activeCountdown, { color: gold }]}>{activeTimeText}</Text>
                    ) : null}

                    <Text style={[styles.activeServiceName, styles.titleOverlay]}>
                      {activeReservation.service?.name ?? 'Usluga'}
                    </Text>
                    {activeReservation.client ? (
                      <View style={styles.activeMetaRow}>
                        <Ionicons name="person-outline" size={16} color={gold} />
                        <Text style={[styles.activeClient, styles.subtleOverlay]}>
                          {activeReservation.client.firstName} {activeReservation.client.lastName}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.activeMetaRow}>
                      <Ionicons name="calendar-outline" size={16} color={gold} />
                      <Text style={[styles.activeMetaText, styles.subtleOverlay]}>
                        {formatDate(activeReservation.reservationDate.slice(0, 10))}
                      </Text>
                    </View>

                    <View style={{ marginTop: spacing.sm }}>
                      <Text style={[styles.activeHint, styles.mutedOverlay]}>
                        Dodirnite karticu za naplatu, završetak i slike.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.activeActionsRow, styles.cardBackdropActions]}>
                    <Button
                      title="Detalji"
                      onPress={() =>
                        navigation.navigate('StylistReservationDetail', {
                          reservationId: activeReservation.id,
                        })
                      }
                      variant="outline"
                      size="sm"
                      icon={
                        <Ionicons
                          name="information-circle-outline"
                          size={18}
                          color={colors.primary}
                        />
                      }
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Naplata"
                      onPress={() =>
                        navigation.navigate('StylistReservationDetail', {
                          reservationId: activeReservation.id,
                        })
                      }
                      size="sm"
                      icon={<Ionicons name="cash-outline" size={18} color={colors.primaryText} />}
                      style={{ flex: 1 }}
                    />
                  </View>
                </ImageBackground>
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.activeContent, { padding: spacing.lg }]}
                    onPress={() =>
                      navigation.navigate('StylistReservationDetail', {
                        reservationId: activeReservation.id,
                      })
                    }
                  >
                    <View style={styles.activeHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activeTitle, { color: colors.text }]}>
                          Aktivna rezervacija
                        </Text>
                        <Text style={[styles.activeTimeRange, { color: colors.textSecondary }]}>
                          {formatTime(activeReservation.startTime)} –{' '}
                          {formatTime(activeReservation.endTime)}
                        </Text>
                      </View>
                      <Badge
                        label={t(`myReservations.status.${activeReservation.status}` as any)}
                        variant={getStatusVariant(activeReservation.status)}
                        status={activeReservation.status}
                      />
                    </View>

                    {activeTimeText ? (
                      <Text style={[styles.activeCountdown, { color: colors.primary }]}>
                        {activeTimeText}
                      </Text>
                    ) : null}

                    <Text style={[styles.activeServiceName, { color: colors.text }]}>
                      {activeReservation.service?.name ?? 'Usluga'}
                    </Text>
                    {activeReservation.client ? (
                      <View style={styles.activeMetaRow}>
                        <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.activeClient, { color: colors.textSecondary }]}>
                          {activeReservation.client.firstName} {activeReservation.client.lastName}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.activeMetaRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.activeMetaText, { color: colors.textSecondary }]}>
                        {formatDate(activeReservation.reservationDate.slice(0, 10))}
                      </Text>
                    </View>

                    <View style={{ marginTop: spacing.sm }}>
                      <Text style={[styles.activeHint, { color: colors.textMuted }]}>
                        Dodirnite karticu za naplatu, završetak i slike.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.activeActionsRow, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
                    <Button
                      title="Detalji"
                      onPress={() =>
                        navigation.navigate('StylistReservationDetail', {
                          reservationId: activeReservation.id,
                        })
                      }
                      variant="outline"
                      size="sm"
                      icon={
                        <Ionicons
                          name="information-circle-outline"
                          size={18}
                          color={colors.primary}
                        />
                      }
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Naplata"
                      onPress={() =>
                        navigation.navigate('StylistReservationDetail', {
                          reservationId: activeReservation.id,
                        })
                      }
                      size="sm"
                      icon={<Ionicons name="cash-outline" size={18} color={colors.primaryText} />}
                      style={{ flex: 1 }}
                    />
                  </View>
                </>
              )}
            </Card>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nema termina"
            message="Vaši potvrđeni i zakazani termini pojavit će se ovdje."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const heroUri = item.service?.heroImage ? getUploadUrl(item.service.heroImage) : null;
          return (
            <Card
              style={[styles.card, heroUri ? styles.cardBackdrop : null]}
              padded={!heroUri}
              onPress={() =>
                navigation.navigate('StylistReservationDetail', {
                  reservationId: item.id,
                })
              }
            >
              {heroUri ? (
                <ImageBackground
                  source={{ uri: heroUri }}
                  style={styles.cardBackdropImage}
                  imageStyle={styles.cardBackdropImageStyle}
                  resizeMode="cover"
                >
                  <View
                    style={[
                      styles.cardBackdropOverlay,
                      { backgroundColor: 'rgba(0,0,0,0.35)' },
                    ]}
                  />

                  <View style={[styles.listContent, styles.cardBackdropContent]}>
                    <View style={styles.row}>
                      <View style={styles.inlineRow}>
                        <Ionicons name="time-outline" size={16} color={gold} />
                        <Text style={[styles.time, styles.titleOverlay]}>
                          {formatTime(item.startTime)} – {formatTime(item.endTime)}
                        </Text>
                      </View>
                      <Badge
                        label={t(`myReservations.status.${item.status}` as any)}
                        variant={getStatusVariant(item.status)}
                        status={item.status}
                      />
                    </View>
                    <View style={[styles.inlineRow, { marginTop: 2 }]}>
                      <Ionicons name="cut-outline" size={16} color={gold} />
                      <Text style={[styles.serviceName, styles.titleOverlay]}>
                        {item.service?.name ?? 'Usluga'}
                      </Text>
                    </View>
                    {item.client && (
                      <View style={[styles.inlineRow, { marginTop: 4 }]}>
                        <Ionicons name="person-outline" size={16} color={gold} />
                        <Text style={[styles.client, styles.subtleOverlay]}>
                          {item.client.firstName} {item.client.lastName}
                        </Text>
                      </View>
                    )}
                  </View>
                </ImageBackground>
              ) : (
                <View style={styles.listContent}>
                  <View style={styles.row}>
                    <View style={styles.inlineRow}>
                      <Ionicons name="time-outline" size={16} color={gold} />
                      <Text style={[styles.time, { color: colors.text }]}>
                        {formatTime(item.startTime)} – {formatTime(item.endTime)}
                      </Text>
                    </View>
                    <Badge
                      label={t(`myReservations.status.${item.status}` as any)}
                      variant={getStatusVariant(item.status)}
                      status={item.status}
                    />
                  </View>
                  <View style={[styles.inlineRow, { marginTop: 2 }]}>
                    <Ionicons name="cut-outline" size={16} color={gold} />
                    <Text style={[styles.serviceName, { color: colors.text }]}>
                      {item.service?.name ?? 'Usluga'}
                    </Text>
                  </View>
                  {item.client && (
                    <View style={[styles.inlineRow, { marginTop: 4 }]}>
                      <Ionicons name="person-outline" size={16} color={gold} />
                      <Text style={[styles.client, { color: colors.textSecondary }]}>
                        {item.client.firstName} {item.client.lastName}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  emptyList: { flex: 1 },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  card: { marginBottom: spacing.sm },
  listContent: {
    position: 'relative',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  time: { fontSize: 15, fontWeight: '600' },
  serviceName: { fontSize: 15 },
  client: { fontSize: 13, marginTop: 2 },
  hint: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Active reservation "hero" card (in focus)
  activeCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    minHeight: 220,
    overflow: 'hidden',
  },
  activeContent: {
    position: 'relative',
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: spacing.xs,
  },
  activeTitle: { fontSize: 18, fontWeight: '900' },
  activeTimeRange: { fontSize: 14, marginTop: 2, fontWeight: '600' },
  activeCountdown: { fontSize: 24, fontWeight: '900', marginTop: spacing.sm },
  activeServiceName: { fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  activeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  activeClient: { fontSize: 14, fontWeight: '600' },
  activeMetaText: { fontSize: 13, fontWeight: '600' },
  activeHint: { fontSize: 12, fontWeight: '600' },
  activeActionsRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },

  // Backdrop image styling (match client services cards feel)
  cardBackdrop: { overflow: 'hidden', padding: 0 },
  cardBackdropImage: { minHeight: 100, justifyContent: 'flex-end' },
  cardBackdropImageStyle: { borderRadius: 16 },
  cardBackdropOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  cardBackdropContent: { padding: spacing.md },
  cardBackdropActions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  // Overlay text styling (for better contrast on backdrop images)
  titleOverlay: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtleOverlay: { color: 'rgba(255,255,255,0.92)' },
  mutedOverlay: { color: 'rgba(255,255,255,0.78)' },
  activeBackdropContent: { padding: spacing.lg },

});
