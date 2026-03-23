import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ServiceDetailScreen } from '../../../src/screens/client/ServiceDetailScreen';

export default function ServiceDetailRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ServiceDetailScreen}
      appKind="client"
      currentTab="ServicesTab"
      currentScreenName="ServiceDetail"
    />
  );
}

