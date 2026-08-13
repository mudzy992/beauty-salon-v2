import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import api from '../../services/api';
import {
  clientLabel,
  type DirectBookingClient,
  type DirectBookingService,
} from './direct-booking-pickers';

export const useStylistDirectBookingForm = (onCreated: () => void) => {
  const [clients, setClients] = useState<DirectBookingClient[]>([]);
  const [services, setServices] = useState<DirectBookingService[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<DirectBookingClient | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [clientNotes, setClientNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<DirectBookingService[] | { items: DirectBookingService[] }>('/api/services', {
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
        .get<{ items: DirectBookingClient[] }>('/api/users/clients', {
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

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    if (selectedClient && value.trim() !== clientLabel(selectedClient)) {
      setSelectedClient(null);
      setServiceIds([]);
    }
  };

  const handleSelectClient = (client: DirectBookingClient) => {
    setSelectedClient(client);
    setClientSearch(clientLabel(client));
    setServiceIds([]);
  };

  const handleToggleServiceId = (serviceId: string) => {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
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
        { text: 'U redu', onPress: onCreated },
      ]);
    } catch (error: any) {
      Alert.alert('Greška', error?.response?.data?.message ?? 'Kreiranje termina nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  return {
    clients,
    clientSearch,
    selectedClient,
    filteredServices,
    serviceIds,
    reservationDate,
    startTime,
    endTime,
    clientNotes,
    saving,
    setReservationDate,
    setStartTime,
    setEndTime,
    setClientNotes,
    handleClientSearchChange,
    handleSelectClient,
    handleToggleServiceId,
    handleSubmit,
  };
};
