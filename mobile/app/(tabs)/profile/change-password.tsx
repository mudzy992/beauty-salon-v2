import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ChangePasswordScreen } from '../../../src/screens/client/ChangePasswordScreen';

export default function ChangePasswordRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ChangePasswordScreen}
      appKind="client"
      currentTab="ProfileTab"
      currentScreenName="ChangePassword"
    />
  );
}

