import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ReservationScreen } from '../../../src/screens/client/ReservationScreen';

export default function ReservationRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ReservationScreen}
      appKind="client"
      currentTab="ServicesTab"
      currentScreenName="Reservation"
    />
  );
}

