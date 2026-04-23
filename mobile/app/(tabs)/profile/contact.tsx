import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ContactScreen } from '../../../src/screens/client/ContactScreen';

export default function ContactRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ContactScreen}
      appKind="client"
      currentTab="ProfileTab"
      currentScreenName="Contact"
    />
  );
}

