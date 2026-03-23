import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { BlogListScreen } from '../../../src/screens/client/BlogListScreen';

export default function BlogListRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={BlogListScreen}
      appKind="client"
      currentTab="HomeTab"
      currentScreenName="BlogList"
    />
  );
}

