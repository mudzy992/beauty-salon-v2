import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { getSalonDateOnly } from '../../utils/date';
import { normalizeClientSearchResults } from '../../utils/apiPayload';
import { getApiErrorMessage } from '../../utils/apiError';
import { fetchAllNormalizedPublicServices } from '../../services/catalog';
import {
  clientLabel,
  type DirectBookingClient,
  type DirectBookingService,
} from './direct-booking-pickers';

export const useStylistDirectBookingForm = (onCreated: () => void) => {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const actionIdentity = useRef({ generation: 0, actionId: 0, mounted: true, active: false });
  const [clients, setClients] = useState<DirectBookingClient[]>([]);
  const [services, setServices] = useState<DirectBookingService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesLoadError, setServicesLoadError] = useState(false);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [clientSearchLoadError, setClientSearchLoadError] = useState(false);
  const [clientSearchRetryCount, setClientSearchRetryCount] = useState(0);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<DirectBookingClient | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [reservationDate, setReservationDate] = useState(() => getSalonDateOnly());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [clientNotes, setClientNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const clientSearchGeneration = useRef(0);
  const serviceLoadGeneration = useRef(0);

  useEffect(() => {
    actionIdentity.current.mounted = true;
    return () => {
      actionIdentity.current.mounted = false;
      actionIdentity.current.generation += 1;
      actionIdentity.current.actionId += 1;
      actionIdentity.current.active = false;
      clientSearchGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    actionIdentity.current.generation += 1;
    actionIdentity.current.actionId += 1;
    actionIdentity.current.active = false;
    clientSearchGeneration.current += 1;
    setClients([]);
    setClientSearch('');
    setSelectedClient(null);
    setServiceIds([]);
    setClientSearchLoadError(false);
    setClientSearchLoading(false);
    setClientNotes('');
    setSaving(false);
  }, [userId]);

  const beginAction = useCallback(() => {
    if (!userId || actionIdentity.current.active) return null;
    actionIdentity.current.active = true;
    const actionId = ++actionIdentity.current.actionId;
    const generation = actionIdentity.current.generation;
    const isCurrentIdentity = () =>
      actionIdentity.current.mounted &&
      actionIdentity.current.actionId === actionId &&
      actionIdentity.current.generation === generation &&
      useAuthStore.getState().user?.id === userId;
    const isCurrent = () => actionIdentity.current.active && isCurrentIdentity();
    const finish = () => {
      if (actionIdentity.current.actionId === actionId) actionIdentity.current.active = false;
    };
    return { isCurrent, isCurrentIdentity, finish };
  }, [userId]);

  const loadServices = useCallback(async () => {
    const generation = ++serviceLoadGeneration.current;
    setServicesLoading(true);
    setServicesLoadError(false);
    try {
      const loadedServices = await fetchAllNormalizedPublicServices({ activeOnly: 'true' });
      if (serviceLoadGeneration.current === generation) setServices(loadedServices);
    } catch {
      if (serviceLoadGeneration.current === generation) setServicesLoadError(true);
    } finally {
      if (serviceLoadGeneration.current === generation) setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
    return () => {
      serviceLoadGeneration.current += 1;
    };
  }, [loadServices]);

  useEffect(() => {
    const generation = ++clientSearchGeneration.current;
    if (!userId) {
      setClients([]);
      setClientSearchLoading(false);
      setClientSearchLoadError(false);
      return;
    }
    const isCurrentSearch = () =>
      clientSearchGeneration.current === generation &&
      useAuthStore.getState().user?.id === userId;
    const handle = setTimeout(() => {
      const q = clientSearch.trim();
      if (!q) {
        setClients([]);
        setClientSearchLoading(false);
        setClientSearchLoadError(false);
        return;
      }
      if (selectedClient && q === clientLabel(selectedClient)) {
        setClients([selectedClient]);
        setClientSearchLoading(false);
        setClientSearchLoadError(false);
        return;
      }
      setClientSearchLoading(true);
      setClientSearchLoadError(false);
      api
        .get<unknown>('/api/users/clients', {
          params: { page: 0, pageSize: 10, q },
        })
        .then(({ data }) => {
          if (!isCurrentSearch()) return;
          const results = normalizeClientSearchResults(data);
          if (!results) throw new Error();
          setClients(results);
        })
        .catch(() => {
          if (isCurrentSearch()) {
            setClients([]);
            setClientSearchLoadError(true);
          }
        })
        .finally(() => {
          if (isCurrentSearch()) setClientSearchLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(handle);
      if (clientSearchGeneration.current === generation) clientSearchGeneration.current += 1;
    };
  }, [clientSearch, selectedClient, clientSearchRetryCount, userId]);

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
    setClientSearchLoadError(false);
    setClientSearchLoading(false);
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

  const handleRetryClientSearch = () => {
    setClientSearchLoadError(false);
    setClientSearchRetryCount((count) => count + 1);
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
      Alert.alert(t('common.error'), t('stylist.directBooking.noClientError'));
      return;
    }
    if (!selectedClient.gender) {
      Alert.alert(t('common.error'), t('stylist.directBooking.missingGenderError'));
      return;
    }
    const action = beginAction();
    if (!action) return;
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
      if (!action.isCurrent()) return;
      Alert.alert(
        t('stylist.directBooking.successTitle'),
        t('stylist.directBooking.successMessage'),
        [{
          text: t('common.ok'),
          onPress: () => {
            if (action.isCurrentIdentity()) onCreated();
          },
        }],
      );
    } catch (error: unknown) {
      if (!action.isCurrent()) return;
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(error, t('stylist.directBooking.errorFallback')),
      );
    } finally {
      if (action.isCurrent()) setSaving(false);
      action.finish();
    }
  };

  return {
    clients,
    clientSearch,
    clientSearchLoading,
    clientSearchLoadError,
    handleRetryClientSearch,
    selectedClient,
    servicesLoading,
    servicesLoadError,
    servicesHaveData: services.length > 0,
    retryServices: loadServices,
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
