import React from 'react';
import { ReactNavScreenWrapper } from '../../../../_components/ReactNavScreenWrapper';
import { DailyLogDetailScreen } from '../../../../../src/screens/stylist/DailyLogDetailScreen';

export default function DailyLogDetailRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={DailyLogDetailScreen}
      appKind="stylist"
      currentTab="DailyLogTab"
      currentScreenName="DailyLogDetail"
    />
  );
}

