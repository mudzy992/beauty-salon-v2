import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { SatisfiedClientsScreen } from '../../../src/screens/client/SatisfiedClientsScreen';

export default function SatisfiedClientsRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={SatisfiedClientsScreen}
      appKind="client"
      currentTab="HomeTab"
      currentScreenName="SatisfiedClients"
    />
  );
}

