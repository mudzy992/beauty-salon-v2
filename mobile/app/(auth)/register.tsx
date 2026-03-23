import React from 'react';
import { ReactNavScreenWrapper } from '../_components/ReactNavScreenWrapper';
import { RegisterScreen } from '../../src/screens/auth/RegisterScreen';

export default function RegisterRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={RegisterScreen}
      appKind="auth"
      currentTab={null}
      currentScreenName="Register"
    />
  );
}

