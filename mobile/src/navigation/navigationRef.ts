import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToClientReservations(opts?: { focusReservationId?: string }) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Main', {
    screen: 'ReservationsTab',
    params: { screen: 'MyReservations', params: { focusReservationId: opts?.focusReservationId } },
  } as any);
}

