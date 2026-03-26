import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ServiceWorkGalleryScreen } from '../../../src/screens/client/ServiceWorkGalleryScreen';

export default function ServiceWorkGalleryRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ServiceWorkGalleryScreen}
      appKind="client"
      currentTab="ServicesTab"
      currentScreenName="ServiceWorkGallery"
    />
  );
}

