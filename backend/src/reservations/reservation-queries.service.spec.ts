import { ForbiddenException } from '@nestjs/common';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ReservationQueriesService } from './reservation-queries.service';

const prisma = {
  reservation: { findUnique: jest.fn() },
  dailyLogEntry: { findFirst: jest.fn() },
};
const dates = {
  getAttendanceConfirmDeadlineHours: jest.fn().mockResolvedValue(24),
  combineDateAndTime: jest.fn((date: Date) => date),
};
const shared = { getStylistProfileIdByUserId: jest.fn() };

const stylist: CurrentUserPayload = {
  sub: 'stylist-1',
  username: 'stylist',
  email: 'stylist@example.test',
  roles: ['STYLIST'],
};

describe('ReservationQueriesService detail projection', () => {
  let service: ReservationQueriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.reservation.findUnique.mockResolvedValue({
      id: 'reservation-1',
      clientId: 'client-1',
      confirmedStylistId: 'profile-1',
      stylistResponses: [],
      reservationDate: new Date('2026-01-15T00:00:00.000Z'),
      startTime: '09:00',
      endTime: '09:45',
      status: 'CONFIRMED',
      attendancePolicy: 'CLIENT_REQUIRED',
    });
    prisma.dailyLogEntry.findFirst.mockResolvedValue(null);
    shared.getStylistProfileIdByUserId.mockResolvedValue('profile-1');
    service = new ReservationQueriesService(
      prisma as never,
      dates as never,
      shared as never,
    );
  });

  it('does not treat a missing stylist profile as ownership of unassigned bookings', async () => {
    prisma.reservation.findUnique.mockResolvedValue({
      id: 'unassigned-reservation',
      clientId: 'another-client',
      confirmedStylistId: null,
      stylistResponses: [],
      reservationDate: new Date('2026-01-15T00:00:00.000Z'),
      startTime: '09:00',
      endTime: '09:45',
      status: 'PENDING',
      attendancePolicy: 'CLIENT_REQUIRED',
    });
    shared.getStylistProfileIdByUserId.mockResolvedValue(null);
    const unrelatedClient: CurrentUserPayload = {
      sub: 'client-2',
      username: 'other-client',
      email: 'other-client@example.test',
      roles: ['CLIENT'],
    };

    await expect(
      service.findOne('unassigned-reservation', unrelatedClient),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.dailyLogEntry.findFirst).not.toHaveBeenCalled();
  });

  it('omits bearer view tokens and idempotency scalars from staff detail reads', async () => {
    const result = await service.findOne('reservation-1', stylist);

    expect(prisma.reservation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'reservation-1' },
        omit: {
          clientViewToken: true,
          idempotencyKey: true,
          idempotencyRequestHash: true,
        },
      }),
    );
    expect(result).not.toHaveProperty('clientViewToken');
    expect(result).not.toHaveProperty('idempotencyKey');
    expect(result).not.toHaveProperty('idempotencyRequestHash');
  });
});
