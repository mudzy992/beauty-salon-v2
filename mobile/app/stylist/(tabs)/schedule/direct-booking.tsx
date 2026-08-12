import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { StylistDirectBookingScreen } from '../../../../src/screens/stylist/StylistDirectBookingScreen';

export default function DirectBookingRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={StylistDirectBookingScreen}
      appKind="stylist"
      currentTab="ScheduleTab"
      currentScreenName="StylistDirectBooking"
    />
  );
}
