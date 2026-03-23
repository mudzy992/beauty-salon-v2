import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { MyReservationsScreen } from '../../../src/screens/client/MyReservationsScreen';

export default function MyReservationsRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={MyReservationsScreen}
      appKind="client"
      currentTab="ReservationsTab"
      currentScreenName="MyReservations"
    />
  );
}

