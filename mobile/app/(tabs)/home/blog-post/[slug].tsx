import React from 'react';
import { ReactNavScreenWrapper } from '../../../_components/ReactNavScreenWrapper';
import { BlogPostScreen } from '../../../../src/screens/client/BlogPostScreen';

export default function BlogPostRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={BlogPostScreen}
      appKind="client"
      currentTab="HomeTab"
      currentScreenName="BlogPost"
    />
  );
}

