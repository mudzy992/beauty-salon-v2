import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { DailyLogListScreen } from '../../../../src/screens/stylist/DailyLogListScreen';

export default function DailyLogListRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={DailyLogListScreen}
      appKind="stylist"
      currentTab="DailyLogTab"
      currentScreenName="DailyLogList"
    />
  );
}

