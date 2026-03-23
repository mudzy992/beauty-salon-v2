import React from 'react';
import { ReactNavScreenWrapper } from '../../../../_components/ReactNavScreenWrapper';
import { StylistReservationDetailScreen } from '../../../../../src/screens/stylist/StylistReservationDetailScreen';

export default function StylistReservationDetailRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={StylistReservationDetailScreen}
      appKind="stylist"
      currentTab="ScheduleTab"
      currentScreenName="StylistReservationDetail"
    />
  );
}

