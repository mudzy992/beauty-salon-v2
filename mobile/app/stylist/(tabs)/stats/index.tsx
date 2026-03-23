import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { StylistStatsScreen } from '../../../../src/screens/stylist/StylistStatsScreen';

export default function StatsRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={StylistStatsScreen}
      appKind="stylist"
      currentTab="StatsTab"
      currentScreenName="StatsTab"
    />
  );
}

