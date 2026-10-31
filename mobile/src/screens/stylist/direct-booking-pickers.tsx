import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';

export type DirectBookingClient = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
};

export type DirectBookingService = {
  id: string;
  name: string;
  durationMinutes?: number;
  price?: number | string;
  gender?: 'MALE' | 'FEMALE';
};

type Colors = {
  text: string;
  textSecondary: string;
  primary: string;
  borderLight: string;
  card: string;
  warning: string;
};

type Props = {
  colors: Colors;
  clients: DirectBookingClient[];
  selectedClient: DirectBookingClient | null;
  filteredServices: DirectBookingService[];
  servicesLoading: boolean;
  servicesLoadError: boolean;
  serviceIds: string[];
  onSelectClient: (client: DirectBookingClient) => void;
  onToggleServiceId: (serviceId: string) => void;
};

export const clientLabel = (client: DirectBookingClient): string =>
  `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() ||
  client.username ||
  client.id;

export const DirectBookingPickers = ({
  colors,
  clients,
  selectedClient,
  filteredServices,
  servicesLoading,
  servicesLoadError,
  serviceIds,
  onSelectClient,
  onToggleServiceId,
}: Props) => {
  const { t } = useTranslation();
  return (
    <>
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
            onPress={() => onSelectClient(client)}
          >
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {clientLabel(client)}
            </Text>
            <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>
              {client.gender === 'MALE'
                ? t('stylist.directBooking.genderMale')
                : client.gender === 'FEMALE'
                  ? t('stylist.directBooking.genderFemale')
                  : t('stylist.directBooking.genderUndefined')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
      {t('stylist.directBooking.servicesTitle')}
    </Text>
    {!selectedClient ? (
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
        {t('stylist.directBooking.selectClientPrompt')}
      </Text>
    ) : !selectedClient.gender ? (
      <Text style={{ color: colors.warning, fontSize: 13 }}>
        {t('stylist.directBooking.missingGenderWarning')}
      </Text>
    ) : filteredServices.length === 0 ? (
      servicesLoading || servicesLoadError ? null : (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t('stylist.directBooking.noServicesForGender')}
        </Text>
      )
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
              onPress={() => onToggleServiceId(service.id)}
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
    </>
  );
};

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 14, fontWeight: '600' },
  list: { gap: spacing.sm },
  option: { borderWidth: 1, borderRadius: 14, padding: spacing.md },
  optionTitle: { fontSize: 14, fontWeight: '600' },
  optionMeta: { fontSize: 12, marginTop: 4 },
});
