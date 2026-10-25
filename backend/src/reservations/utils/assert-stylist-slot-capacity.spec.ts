import { BadRequestException } from '@nestjs/common';
import {
  assertReservationSlotCapacity,
  assertStylistSlotCapacity,
} from './assert-stylist-slot-capacity';
import type { SlotHoldReservation, SlotHoldResponse } from './slot-hold.utils';

const date = '2026-08-13';
const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();

const stylistProfiles = ['sp-a', 'sp-b'].map((id) => ({
  id,
  workingHours: [
    {
      dateOverride: null,
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
    },
  ],
}));

const makePendingHold = (response?: SlotHoldResponse): SlotHoldReservation => ({
  startTime: '09:00',
  endTime: '09:45',
  status: 'PENDING',
  confirmedStylistId: null,
  stylistResponses: response ? [response] : [],
});

describe('assert reservation slot capacity', () => {
  const db = {
    stylistService: {
      findMany: jest.fn().mockResolvedValue([
        { stylistProfileId: 'sp-a', serviceId: 'service-1' },
        { stylistProfileId: 'sp-b', serviceId: 'service-1' },
      ]),
    },
    stylistProfile: {
      findMany: jest.fn().mockResolvedValue(stylistProfiles),
    },
    reservation: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const capacityDb = db as unknown as Parameters<
    typeof assertReservationSlotCapacity
  >[0]['db'];

  beforeEach(() => {
    jest.clearAllMocks();
    db.stylistService.findMany.mockResolvedValue([
      { stylistProfileId: 'sp-a', serviceId: 'service-1' },
      { stylistProfileId: 'sp-b', serviceId: 'service-1' },
    ]);
    db.stylistProfile.findMany.mockResolvedValue(stylistProfiles);
    db.reservation.findMany.mockResolvedValue([]);
  });

  const assertCapacity = (stylistProfileId = 'sp-a') =>
    assertStylistSlotCapacity({
      db: capacityDb,
      serviceIds: ['service-1'],
      date,
      startTime: '09:00',
      endTime: '09:45',
      stylistProfileId,
    });

  it('rejects a direct booking when pending holds consume all eligible capacity', async () => {
    db.reservation.findMany.mockResolvedValue([
      makePendingHold(),
      makePendingHold(),
    ]);

    await expect(assertCapacity()).rejects.toThrow(BadRequestException);
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: expect.arrayContaining(['PENDING', 'STYLIST_REVIEW']) },
        }),
      }),
    );
  });

  it('does not assign a second direct booking to a stylist with an active inbox lock', async () => {
    db.reservation.findMany.mockResolvedValue([
      makePendingHold({
        stylistProfileId: 'sp-a',
        status: 'LOCKED',
        lockExpiresAt: new Date(Date.now() + 60_000),
      }),
    ]);

    await expect(assertCapacity('sp-a')).rejects.toThrow(
      /aktivno zaključan zahtjev/,
    );
    await expect(assertCapacity('sp-b')).resolves.toBeUndefined();
  });

  it('ignores the reservation being moved while checking free capacity', async () => {
    db.reservation.findMany.mockResolvedValue([makePendingHold()]);

    await expect(
      assertReservationSlotCapacity({
        db: capacityDb,
        serviceIds: ['service-1'],
        date,
        startTime: '09:00',
        endTime: '09:45',
        excludeReservationId: 'current-reservation',
      }),
    ).resolves.toBeUndefined();
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'current-reservation' },
        }),
      }),
    );
  });

  it('rejects invalid calendar dates before querying capacity', async () => {
    await expect(
      assertStylistSlotCapacity({
        db: capacityDb,
        serviceIds: ['service-1'],
        date: '2026-02-30',
        startTime: '09:00',
        endTime: '09:45',
        stylistProfileId: 'sp-a',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(db.reservation.findMany).not.toHaveBeenCalled();
  });
});
