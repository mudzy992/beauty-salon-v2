import React from 'react';
import { ReactNavScreenWrapper } from '../../_components/ReactNavScreenWrapper';
import { ReviewsScreen } from '../../../src/screens/client/ReviewsScreen';

export default function WriteReviewRoute() {
  return (
    <ReactNavScreenWrapper
      ScreenComponent={ReviewsScreen}
      appKind="client"
      currentTab="ReservationsTab"
      currentScreenName="WriteReview"
    />
  );
}

