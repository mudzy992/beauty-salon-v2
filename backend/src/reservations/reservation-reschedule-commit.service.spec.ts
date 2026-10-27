import { Test, TestingModule } from '@nestjs/testing';
import { ReservationRescheduleCommitService } from './reservation-reschedule-commit.service';
import { ReservationRescheduleService } from './reservation-reschedule.service';
import { ReservationSharedService } from './reservation-shared.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma: any = {
  reservation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (cb: unknown) => {
    if (typeof cb === 'function') return cb(mockPrisma);
    return undefined;
  }),
};
const mockNotifications = { send: jest.fn() };
const mockShared = {
  computeRescheduleDeadlineMinutes: jest.fn().mockReturnValue(15),
};
const mockReschedule = {
  proposeReschedule: jest.fn(),
};

describe('ReservationRescheduleCommitService', () => {
  let service: ReservationRescheduleCommitService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationRescheduleCommitService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: ReservationSharedService, useValue: mockShared },
        { provide: ReservationRescheduleService, useValue: mockReschedule },
      ],
    }).compile();
    service = module.get(ReservationRescheduleCommitService);
  });

  it('happy path: propose returns items → updates rescheduleStatus PENDING + sends notification', async () => {
    mockReschedule.proposeReschedule.mockResolvedValue({
      mode: 'actual_overrun',
      overrunMinutes: 10,
      delayMinutes: 10,
      shiftMinutes: 10,
      includeBreaks: false,
      items: [
        {
          id: 'res-future-1',
          clientId: 'client-2',
          serviceName: 'Farbanje',
          clientName: 'Ana B',
          oldStartTime: '11:00',
          oldEndTime: '11:30',
          newStartTime: '11:10',
          newEndTime: '11:40',
          shiftMinutes: 10,
          reducedBreakMinutes: 0,
        },
      ],
    });
    mockPrisma.reservation.findMany.mockImplementation(async (args: any) => {
      if (args?.where?.id?.in) {
        return [
          {
            id: 'res-future-1',
            clientId: 'client-2',
            reservationDate: new Date('2026-03-20'),
            serviceId: 'svc-1',
            items: [{ serviceId: 'svc-1' }],
          },
        ];
      }
      return [];
    });
    mockPrisma.reservation.findUnique.mockResolvedValue({
      reservationDate: new Date('2026-03-20'),
      items: [],
    });

    const result = await service.commitReschedule('res-main', 'user-1', {
      includeBreaks: false,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res-future-1' },
        data: expect.objectContaining({
          rescheduleStatus: 'PENDING',
          rescheduleProposedStartTime: '11:10',
          rescheduleProposedEndTime: '11:40',
        }),
      }),
    );
    expect(mockNotifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'client-2',
        type: 'reservation_reschedule',
        data: expect.objectContaining({
          kind: 'reservation_reschedule',
          reservationId: 'res-future-1',
        }),
      }),
    );
    expect(result.items).toHaveLength(1);
  });

  it('use_break_only path: sets useBreakAfterOverrun, no pending items loop', async () => {
    mockReschedule.proposeReschedule.mockResolvedValue({
      mode: 'use_break_only',
      overrunMinutes: 5,
      delayMinutes: 0,
      shiftMinutes: 0,
      includeBreaks: false,
      items: [],
    });

    const result = await service.commitReschedule('res-main', 'user-1', {
      includeBreaks: false,
      mode: 'use_break_only',
    });

    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res-main' },
        data: expect.objectContaining({
          useBreakAfterOverrun: true,
        }),
      }),
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockNotifications.send).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });
});
