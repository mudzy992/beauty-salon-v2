import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { DailyLogNewEntryScreen } from '../../../../src/screens/stylist/DailyLogNewEntryScreen';

export default function DailyLogNewEntryRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={DailyLogNewEntryScreen}
      appKind="stylist"
      currentTab="DailyLogTab"
      currentScreenName="DailyLogNewEntry"
    />
  );
}

