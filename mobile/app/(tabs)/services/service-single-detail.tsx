import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ServiceSingleDetailScreen } from '../../../src/screens/client/ServiceSingleDetailScreen';

export default function ServiceSingleDetailRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ServiceSingleDetailScreen}
      appKind="client"
      currentTab="ServicesTab"
      currentScreenName="ServiceSingleDetail"
    />
  );
}

