import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ClientReservationDetailScreen } from '../../../src/screens/client/ClientReservationDetailScreen';

export default function ReservationDetailRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ClientReservationDetailScreen}
      appKind="client"
      currentTab="ReservationsTab"
      currentScreenName="ReservationDetail"
    />
  );
}
