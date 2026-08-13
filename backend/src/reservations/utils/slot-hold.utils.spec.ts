import { computeSlotCapacity, type SlotHoldReservation } from './slot-hold.utils';

describe('computeSlotCapacity', () => {
  const stylists = ['sp-a', 'sp-b'];
  const now = new Date('2026-08-13T12:00:00.000Z');

  it('2 slobodna stilista → count 2', () => {
    const actual = computeSlotCapacity({
      slotStart: '15:30',
      slotEnd: '16:00',
      stylistIdsInWindow: stylists,
      reservations: [],
      now,
    });
    expect(actual).toEqual({ availableStylistCount: 2, hasInboxHold: false });
  });

  it('1 PENDING bez locka → count 1', () => {
    const hold: SlotHoldReservation = {
      startTime: '15:30',
      endTime: '16:00',
      status: 'PENDING',
      confirmedStylistId: null,
      stylistResponses: [
        { stylistProfileId: 'sp-a', status: 'PENDING', lockExpiresAt: null },
        { stylistProfileId: 'sp-b', status: 'PENDING', lockExpiresAt: null },
      ],
    };
    const actual = computeSlotCapacity({
      slotStart: '15:30',
      slotEnd: '16:00',
      stylistIdsInWindow: stylists,
      reservations: [hold],
      now,
    });
    expect(actual).toEqual({ availableStylistCount: 1, hasInboxHold: true });
  });

  it('lock + PENDING → count 0, hold ostaje', () => {
    const locked: SlotHoldReservation = {
      startTime: '15:30',
      endTime: '16:00',
      status: 'STYLIST_REVIEW',
      confirmedStylistId: null,
      stylistResponses: [
        {
          stylistProfileId: 'sp-a',
          status: 'LOCKED',
          lockExpiresAt: new Date('2026-08-13T12:10:00.000Z'),
        },
        { stylistProfileId: 'sp-b', status: 'PENDING', lockExpiresAt: null },
      ],
    };
    const pending: SlotHoldReservation = {
      startTime: '15:30',
      endTime: '16:00',
      status: 'PENDING',
      confirmedStylistId: null,
      stylistResponses: [
        { stylistProfileId: 'sp-a', status: 'PENDING', lockExpiresAt: null },
        { stylistProfileId: 'sp-b', status: 'PENDING', lockExpiresAt: null },
      ],
    };
    const actual = computeSlotCapacity({
      slotStart: '15:30',
      slotEnd: '16:00',
      stylistIdsInWindow: stylists,
      reservations: [locked, pending],
      now,
    });
    expect(actual).toEqual({ availableStylistCount: 0, hasInboxHold: true });
  });

  it('CONFIRMED stilist A + slobodan B → count 1', () => {
    const actual = computeSlotCapacity({
      slotStart: '15:30',
      slotEnd: '16:00',
      stylistIdsInWindow: stylists,
      reservations: [
        {
          startTime: '15:30',
          endTime: '16:00',
          status: 'CONFIRMED',
          confirmedStylistId: 'sp-a',
        },
      ],
      now,
    });
    expect(actual).toEqual({ availableStylistCount: 1, hasInboxHold: false });
  });
});
