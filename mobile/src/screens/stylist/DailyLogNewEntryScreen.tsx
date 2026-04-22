import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { spacing } from '../../theme';
import type { Service } from '../../types';

type ClientOption = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  gender: 'MALE' | 'FEMALE' | null;
};

type LoyaltyInfo = {
  enabled: boolean;
  hasAccount: boolean;
  redeemEnabled?: boolean;
  points?: number;
  tier?: string | null;
  tierMaxDiscountPercent?: number;
  globalMaxDiscountPercent?: number;
  minPointsToRedeem?: number;
  redeemRate?: number;
  service?: {
    id: string;
    price: number;
    maxDiscountPercent: number;
    maxDiscountAmount: number;
    maxUsablePoints: number;
  } | null;
};

type DailyLogNewEntryScreenProps = {
  navigation: { goBack: () => void; navigate: (screen: 'DailyLogDetail', params: { entryId: string }) => void };
};

export function DailyLogNewEntryScreen({ navigation }: DailyLogNewEntryScreenProps) {
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { profileId, loading: profileLoading } = useStylistProfile();
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [clientId, setClientId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState(0);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);

  const fetchOptions = useCallback(async () => {
    try {
      const [svcRes, cliRes] = await Promise.all([
        api.get<Service[]>('/api/services', { params: { activeOnly: true } }),
        api.get<ClientOption[]>('/api/users/for-daily-log'),
      ]);
      setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
      setClients(Array.isArray(cliRes.data) ? cliRes.data : []);
    } catch {
      setServices([]);
      setClients([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const selectedServices = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as Service[],
    [serviceIds, services],
  );
  const selectedClient = clients.find((c) => c.id === clientId);
  const baseServices = selectedClient?.gender
    ? services.filter((s) => s.gender === selectedClient.gender)
    : services;
  const filteredServices = serviceSearch.trim()
    ? baseServices.filter((s) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
    : baseServices;
  const filteredClients = clientSearch.trim()
    ? clients.filter(
        (c) =>
          (c.firstName?.toLowerCase().includes(clientSearch.toLowerCase())) ||
          (c.lastName?.toLowerCase().includes(clientSearch.toLowerCase())) ||
          c.username.toLowerCase().includes(clientSearch.toLowerCase()),
      )
    : clients;

  const toggleService = (s: Service) => {
    setServiceIds((prev) => {
      const exists = prev.includes(s.id);
      return exists ? prev.filter((x) => x !== s.id) : [...prev, s.id];
    });
    setDesiredLoyaltyPercent(0);
    setPaidAmount('');
  };

  const selectClient = (c: ClientOption) => {
    setClientId(c.id);
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username;
    setClientSearch(name);
    setShowClientPicker(false);
    if (c.gender && selectedServices.length > 0 && selectedServices.some((s) => s.gender !== c.gender)) {
      setServiceIds([]);
      setServiceSearch('');
    }
    setDesiredLoyaltyPercent(0);
    setPaidAmount('');
  };

  const basePrice = selectedServices.reduce((acc, s) => acc + Number((s as any).price ?? 0), 0);
  const loyaltyPercent =
    loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
      ? Math.max(0, Math.min(desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent))
      : 0;
  const loyaltyDiscountAmount = basePrice > 0 ? (basePrice * loyaltyPercent) / 100 : 0;
  const chargeAmount = Math.max(0, basePrice - loyaltyDiscountAmount);

  useEffect(() => {
    if (serviceIds.length === 0 || !clientId) {
      setLoyaltyInfo(null);
      setDesiredLoyaltyPercent(0);
      return;
    }
    let isMounted = true;
    setLoadingLoyalty(true);
    api
      .get<LoyaltyInfo>(`/api/loyalty/stylist/client/${clientId}`, {
        params: { serviceIds: serviceIds.join(',') },
      })
      .then((r) => {
        if (!isMounted) return;
        setLoyaltyInfo(r.data);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoyaltyInfo(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingLoyalty(false);
      });
    return () => {
      isMounted = false;
    };
  }, [serviceIds, clientId]);

  const handleSubmit = useCallback(async () => {
    if (!profileId) {
      Alert.alert('Greška', 'Profil stilista nije pronađen.');
      return;
    }
    if (!clientId) {
      Alert.alert('Greška', 'Odaberite klijenta.');
      return;
    }
    if (!selectedClient?.gender) {
      Alert.alert('Greška', 'Klijent mora imati definisan spol.');
      return;
    }
    if (serviceIds.length === 0) {
      Alert.alert('Greška', 'Odaberite servis(e).');
      return;
    }
    const paidRaw = paidAmount.trim()
      ? parseFloat(paidAmount.replace(',', '.'))
      : chargeAmount;
    if (isNaN(paidRaw) || paidRaw < 0) {
      Alert.alert('Greška', 'Unesite ispravan iznos naplaćenog računa.');
      return;
    }
    if (paidRaw < chargeAmount) {
      Alert.alert(
        'Greška',
        `Naplaćeni iznos ne može biti manji od iznosa za naplatu (${chargeAmount.toFixed(2)} KM).`,
      );
      return;
    }
    const tip = Math.max(0, paidRaw - chargeAmount);
    setSaving(true);
    try {
      const { data: entry } = await api.post<{ id: string }>('/api/daily-log', {
        stylistProfileId: profileId,
        serviceIds,
        clientId,
        date,
        actualPrice: paidRaw,
        tipAmount: tip,
        notes: notes.trim() || undefined,
        isManual: true,
        ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
      });
      navigation.navigate('DailyLogDetail', { entryId: entry.id });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri kreiranju zapisa.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  }, [profileId, serviceIds, clientId, date, paidAmount, chargeAmount, notes, loyaltyPercent, navigation]);

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
        <Text style={{ color: colors.text }}>Profil stilista nije pronađen.</Text>
        <Button title="Nazad" onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarBottom }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Klijent</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowClientPicker(true)}
          >
            <Text style={[styles.pickerText, { color: selectedClient ? colors.text : colors.textMuted }]}>
              {selectedClient
                ? [selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ') || selectedClient.username
                : 'Odaberi klijenta'}
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Servis</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowServicePicker(true)}
            disabled={!selectedClient?.gender}
          >
            <Text style={[styles.pickerText, { color: selectedServices.length > 0 ? colors.text : colors.textMuted }]}>
              {!selectedClient
                ? 'Prvo odaberite klijenta'
                : !selectedClient.gender
                  ? 'Klijent nema definisan spol'
                  : selectedServices.length > 0
                    ? `${selectedServices.length} servis(a) odabrano`
                    : 'Odaberi servis(e)'}
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.card}>
          <Input label="Datum" value={date} onChangeText={setDate} />
          <Input
            label="Naplaćeno (KM)"
            value={paidAmount}
            onChangeText={setPaidAmount}
            keyboardType="decimal-pad"
            placeholder={chargeAmount > 0 ? chargeAmount.toFixed(2) : '0.00'}
          />
          <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
            Servisi: {Number.isFinite(basePrice) ? basePrice.toFixed(2) : '0.00'} KM
          </Text>
          {loyaltyPercent > 0 && (
            <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
              Loyalty popust: {loyaltyPercent}% ({loyaltyDiscountAmount.toFixed(2)} KM)
            </Text>
          )}
          <Text style={{ color: colors.text, marginTop: 2, fontWeight: '700' }}>
            Za naplatu: {chargeAmount.toFixed(2)} KM
          </Text>
          <Input label="Napomena (opciono)" value={notes} onChangeText={setNotes} multiline />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Loyalty</Text>
          {loadingLoyalty ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service ? (
            <>
              <Text style={{ color: colors.text }}>
                Bodovi: {loyaltyInfo.points ?? 0} · Max popust: {loyaltyInfo.service.maxDiscountPercent}%
              </Text>
              <Input
                label="Popust (%)"
                value={String(desiredLoyaltyPercent)}
                onChangeText={(v) => {
                  const n = Math.max(0, Math.min(parseInt(v || '0', 10) || 0, loyaltyInfo.service?.maxDiscountPercent ?? 0));
                  setDesiredLoyaltyPercent(n);
                }}
                keyboardType="number-pad"
              />
              <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>
                Max iznos popusta: {Number(loyaltyInfo.service.maxDiscountAmount ?? 0).toFixed(2)} KM
              </Text>
            </>
          ) : (
            <Text style={{ color: colors.textMuted }}>
              Loyalty nije dostupan za odabranog klijenta ili servis.
            </Text>
          )}
        </Card>

        <Button title="Kreiraj zapis" onPress={handleSubmit} loading={saving} />
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Nakon kreiranja možete dodati before/after slike i završiti zapis u detalju.
        </Text>
      </ScrollView>

      <Modal visible={showServicePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={{ ...styles.pickerModal, backgroundColor: colors.surface }}>
            <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Odaberi servis</Text>
            <Input
              placeholder="Pretraži..."
              value={serviceSearch}
              onChangeText={setServiceSearch}
              style={{ marginBottom: spacing.sm }}
            />
            <FlatList
              data={filteredServices}
              keyExtractor={(s) => s.id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderColor: colors.border }]}
                  onPress={() => toggleService(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text }}>{item.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{Number(item.price).toFixed(2)} KM</Text>
                  </View>
                  <Text style={{ color: serviceIds.includes(item.id) ? colors.primary : colors.textMuted }}>
                    {serviceIds.includes(item.id) ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button title="U redu" variant="outline" onPress={() => setShowServicePicker(false)} />
          </Card>
        </View>
      </Modal>

      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={{ ...styles.pickerModal, backgroundColor: colors.surface }}>
            <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Odaberi klijenta</Text>
            <Input
              placeholder="Pretraži..."
              value={clientSearch}
              onChangeText={setClientSearch}
              style={{ marginBottom: spacing.sm }}
            />
            <FlatList
              data={filteredClients.slice(0, 50)}
              keyExtractor={(c) => c.id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderColor: colors.border }]}
                  onPress={() => selectClient(item)}
                >
                  <Text style={{ color: colors.text }}>
                    {[item.firstName, item.lastName].filter(Boolean).join(' ') || item.username}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button title="Zatvori" variant="outline" onPress={() => setShowClientPicker(false)} />
          </Card>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: 4, fontWeight: '600' },
  pickerBtn: { borderWidth: 1, borderRadius: 8, padding: 14 },
  pickerText: { fontSize: 16 },
  hint: { fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.md },
  pickerModal: { padding: spacing.md, maxHeight: '80%' },
  pickerModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  pickerList: { maxHeight: 300, marginBottom: spacing.sm },
  pickerItem: { padding: 12, borderBottomWidth: 1 },
});
