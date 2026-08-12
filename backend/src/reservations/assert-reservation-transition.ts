import { BadRequestException } from '@nestjs/common';
import {
  RESERVATION_STATUS,
  RESERVATION_TRANSITIONS,
  type ReservationStatus,
} from './constants';

export const isReservationStatus = (value: string): value is ReservationStatus =>
  Object.values(RESERVATION_STATUS).includes(value as ReservationStatus);

export const canReservationTransition = (
  from: string,
  to: ReservationStatus,
): boolean => {
  if (!isReservationStatus(from)) return false;
  return RESERVATION_TRANSITIONS[from].includes(to);
};

export const assertReservationTransition = (
  from: string,
  to: ReservationStatus,
): void => {
  if (canReservationTransition(from, to)) return;
  throw new BadRequestException(
    `Nedozvoljen prijelaz statusa rezervacije: ${from} → ${to}.`,
  );
};
