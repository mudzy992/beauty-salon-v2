import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { StylistProfileScreen } from '../../../../src/screens/stylist/StylistProfileScreen';

export default function StylistProfileRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={StylistProfileScreen}
      appKind="stylist"
      currentTab="ProfileTab"
      currentScreenName="ProfileTab"
    />
  );
}

