import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';
import { spacing } from '../../theme';

type ClientOption = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
};

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes?: number;
  price?: number | string;
  gender?: 'MALE' | 'FEMALE';
};

const clientLabel = (client: ClientOption): string =>
  `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() ||
  client.username ||
  client.id;

export function StylistDirectBookingScreen({
  navigation,
}: {
  navigation: { goBack: () => void };
}) {
  const { colors } = useTheme();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [clientNotes, setClientNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<ServiceOption[] | { items: ServiceOption[] }>('/api/services', {
        params: { page: 0, pageSize: 300, activeOnly: 'true' },
      })
      .then(({ data }) => setServices(Array.isArray(data) ? data : data.items ?? []))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const q = clientSearch.trim();
      if (!q) {
        setClients([]);
        return;
      }
      if (selectedClient && q === clientLabel(selectedClient)) {
        setClients([selectedClient]);
        return;
      }
      api
        .get<{ items: ClientOption[] }>('/api/users/clients', {
          params: { page: 0, pageSize: 10, q },
        })
        .then(({ data }) => setClients(Array.isArray(data.items) ? data.items : []))
        .catch(() => setClients([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [clientSearch, selectedClient]);

  const filteredServices = useMemo(() => {
    const gender = selectedClient?.gender;
    if (gender !== 'MALE' && gender !== 'FEMALE') return [];
    return services.filter((service) => service.gender === gender);
  }, [selectedClient?.gender, services]);

  useEffect(() => {
    setServiceIds((current) =>
      current.filter((id) => filteredServices.some((service) => service.id === id)),
    );
  }, [filteredServices]);

  useEffect(() => {
    const totalMinutes = serviceIds
      .map((id) => filteredServices.find((service) => service.id === id)?.durationMinutes ?? 0)
      .reduce((sum, value) => sum + value, 0);
    if (totalMinutes <= 0 || !startTime) return;
    const [hours, minutes] = startTime.split(':').map(Number);
    const total = hours * 60 + minutes + totalMinutes;
    setEndTime(
      `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
    );
  }, [filteredServices, serviceIds, startTime]);

  const toggleServiceId = (serviceId: string) => {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  const handleSelectClient = (client: ClientOption) => {
    setSelectedClient(client);
    setClientSearch(clientLabel(client));
    setServiceIds([]);
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert('Greška', 'Odaberite klijenta.');
      return;
    }
    if (!selectedClient.gender) {
      Alert.alert('Greška', 'Klijent nema definisan spol — ažurirajte profil klijenta.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/reservations/stylist/direct', {
        clientId: selectedClient.id,
        serviceIds,
        reservationDate,
        startTime,
        endTime,
        clientNotes: clientNotes.trim() || undefined,
      });
      Alert.alert('Termin kreiran', 'Direktna rezervacija je odmah dodana u raspored.', [
        { text: 'U redu', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Greška', error?.response?.data?.message ?? 'Kreiranje termina nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Direktna rezervacija</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Termin ide direktno u vaš raspored i ne traži attendance potvrdu klijenta.
        </Text>
        <Input
          label="Klijent"
          value={clientSearch}
          onChangeText={(value) => {
            setClientSearch(value);
            if (selectedClient && value.trim() !== clientLabel(selectedClient)) {
              setSelectedClient(null);
              setServiceIds([]);
            }
          }}
          placeholder="Pretraži klijenta..."
        />
        <View style={styles.list}>
          {clients.map((client) => {
            const selected = client.id === selectedClient?.id;
            return (
              <TouchableOpacity
                key={client.id}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? colors.primary : colors.borderLight,
                    backgroundColor: colors.card,
                  },
                ]}
                onPress={() => handleSelectClient(client)}
              >
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {clientLabel(client)}
                </Text>
                <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                  {client.gender === 'MALE'
                    ? 'Muški'
                    : client.gender === 'FEMALE'
                      ? 'Ženski'
                      : 'Spol nije definisan'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Servisi</Text>
        {!selectedClient ? (
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Prvo odaberite klijenta — lista servisa se filtrira po spolu.
          </Text>
        ) : !selectedClient.gender ? (
          <Text style={{ color: colors.warning, fontSize: 13 }}>
            Klijent nema definisan spol. Servisi se ne mogu filtrirati.
          </Text>
        ) : filteredServices.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Nema aktivnih servisa za odabrani spol.
          </Text>
        ) : (
          <View style={styles.list}>
            {filteredServices.map((service) => {
              const selected = serviceIds.includes(service.id);
              return (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? colors.primary : colors.borderLight,
                      backgroundColor: colors.card,
                    },
                  ]}
                  onPress={() => toggleServiceId(service.id)}
                >
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{service.name}</Text>
                  <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
                    {Number(service.price ?? 0).toFixed(2)} KM
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Input label="Datum" value={reservationDate} onChangeText={setReservationDate} placeholder="YYYY-MM-DD" />
        <Input label="Početak" value={startTime} onChangeText={setStartTime} placeholder="09:00" />
        <Input label="Kraj" value={endTime} onChangeText={setEndTime} placeholder="10:00" />
        <Input
          label="Napomena"
          value={clientNotes}
          onChangeText={setClientNotes}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />

        <View style={styles.actions}>
          <Button title="Odustani" variant="ghost" onPress={() => navigation.goBack()} />
          <Button
            title="Kreiraj termin"
            onPress={handleSubmit}
            loading={saving}
            disabled={
              !selectedClient ||
              !selectedClient.gender ||
              serviceIds.length === 0 ||
              !reservationDate ||
              !startTime ||
              !endTime
            }
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  card: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600' },
  list: { gap: spacing.sm },
  option: { borderWidth: 1, borderRadius: 14, padding: spacing.md },
  optionTitle: { fontSize: 14, fontWeight: '600' },
  optionMeta: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
