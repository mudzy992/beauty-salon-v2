import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { NotificationsScreen } from '../../../src/screens/client/NotificationsScreen';

export default function NotificationsRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={NotificationsScreen}
      appKind="client"
      currentTab="ProfileTab"
      currentScreenName="Notifications"
    />
  );
}

