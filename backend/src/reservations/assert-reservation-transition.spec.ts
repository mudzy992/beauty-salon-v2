import { BadRequestException } from '@nestjs/common';
import {
  assertReservationTransition,
  canReservationTransition,
} from './assert-reservation-transition';
import { RESERVATION_STATUS } from './constants';

describe('assertReservationTransition', () => {
  it('dozvoljava dokumentovane prijelaze', () => {
    expect(
      canReservationTransition(
        RESERVATION_STATUS.PENDING,
        RESERVATION_STATUS.STYLIST_REVIEW,
      ),
    ).toBe(true);
    expect(
      canReservationTransition(
        RESERVATION_STATUS.IN_PROGRESS,
        RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
      ),
    ).toBe(true);
    expect(
      canReservationTransition(
        RESERVATION_STATUS.CONFIRMED,
        RESERVATION_STATUS.IN_PROGRESS,
      ),
    ).toBe(true);
    expect(
      canReservationTransition(
        RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
        RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
      ),
    ).toBe(true);
    expect(
      canReservationTransition(
        RESERVATION_STATUS.COMPLETED,
        RESERVATION_STATUS.IN_PROGRESS,
      ),
    ).toBe(true);
  });

  it('odbija nedozvoljene prijelaze', () => {
    expect(
      canReservationTransition(
        RESERVATION_STATUS.COMPLETED,
        RESERVATION_STATUS.CANCELLED_BY_CLIENT,
      ),
    ).toBe(false);
    expect(
      canReservationTransition(
        RESERVATION_STATUS.NO_SHOW,
        RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
      ),
    ).toBe(false);
    expect(() =>
      assertReservationTransition(
        RESERVATION_STATUS.PENDING,
        RESERVATION_STATUS.COMPLETED,
      ),
    ).toThrow(BadRequestException);
  });
});
