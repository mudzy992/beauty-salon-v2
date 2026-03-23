import React from 'react';
import { ReactNavScreenWrapper } from '../../../../_components/ReactNavScreenWrapper';
import { ReschedulePreviewScreen } from '../../../../../src/screens/stylist/ReschedulePreviewScreen';

export default function ReschedulePreviewRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ReschedulePreviewScreen}
      appKind="stylist"
      currentTab="DailyLogTab"
      currentScreenName="ReschedulePreview"
      parseRouteParams={(params: Record<string, any>) => {
        const v = params.includeBreaks;
        return {
          ...params,
          includeBreaks: v === true || v === 'true' || v === '1',
        };
      }}
    />
  );
}

