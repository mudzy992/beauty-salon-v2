import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { EditProfileScreen } from '../../../src/screens/client/EditProfileScreen';

export default function EditProfileRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={EditProfileScreen}
      appKind="client"
      currentTab="ProfileTab"
      currentScreenName="EditProfile"
    />
  );
}
