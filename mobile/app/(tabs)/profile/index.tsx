import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ProfileScreen } from '../../../src/screens/client/ProfileScreen';

export default function ProfileRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ProfileScreen}
      appKind="client"
      currentTab="ProfileTab"
      currentScreenName="Profile"
    />
  );
}

