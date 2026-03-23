import React from 'react';
import { ReactNavScreenWrapper } from '../_components/ReactNavScreenWrapper';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';

export default function LoginRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={LoginScreen}
      appKind="auth"
      currentTab={null}
      currentScreenName="Login"
    />
  );
}

