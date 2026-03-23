import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ServicesScreen } from '../../../src/screens/client/ServicesScreen';

export default function ServicesRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ServicesScreen}
      appKind="client"
      currentTab="ServicesTab"
      currentScreenName="Services"
    />
  );
}

