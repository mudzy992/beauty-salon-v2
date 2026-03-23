import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { StylistScheduleScreen } from '../../../../src/screens/stylist/StylistScheduleScreen';

export default function ScheduleRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={StylistScheduleScreen}
      appKind="stylist"
      currentTab="ScheduleTab"
      currentScreenName="ScheduleList"
    />
  );
}

