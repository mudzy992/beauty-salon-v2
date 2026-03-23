import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { HomeScreen } from '../../../src/screens/client/HomeScreen';

export default function HomeRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={HomeScreen}
      appKind="client"
      currentTab="HomeTab"
      currentScreenName="Home"
    />
  );
}

