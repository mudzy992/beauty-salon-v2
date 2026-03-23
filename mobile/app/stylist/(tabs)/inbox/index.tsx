import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { StylistInboxScreen } from '../../../../src/screens/stylist/StylistInboxScreen';

export default function InboxRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={StylistInboxScreen}
      appKind="stylist"
      currentTab="InboxTab"
      currentScreenName="InboxTab"
    />
  );
}

