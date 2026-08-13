import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ReservationStaffAttendanceService } from './reservation-staff-attendance.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationDateService } from './reservation-date.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

const mockPrisma: any = {
  reservation: { findUnique: jest.fn(), update: jest.fn() },
};
const mockEvents = {
  emitToAdmins: jest.fn(),
  emitToStylists: jest.fn(),
  emitToUser: jest.fn(),
};
const mockShared = {
  getStylistProfileIdByUserId: jest.fn(),
  transitionTo: jest.fn((_from: string, to: string) => to),
};
const mockQueries = {
  findOne: jest.fn().mockResolvedValue({ id: 'res-1', status: 'ATTENDANCE_CONFIRMED' }),
};
const mockDates = {
  combineDateAndTime: jest.fn(),
};

const stylistUser = {
  sub: 'user-1',
  username: 'stylist',
  email: 's@test.com',
  roles: ['STYLIST'],
};
const adminUser = {
  sub: 'admin-1',
  username: 'admin',
  email: 'a@test.com',
  roles: ['SYSTEM_ADMIN'],
};

const confirmedClientRequired = {
  id: 'res-1',
  clientId: 'client-1',
  status: 'CONFIRMED',
  attendancePolicy: 'CLIENT_REQUIRED',
  confirmedStylistId: 'sp-1',
  reservationDate: new Date('2026-03-10T00:00:00.000Z'),
  startTime: '10:00',
};

describe('ReservationStaffAttendanceService', () => {
  let service: ReservationStaffAttendanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T08:00:00.000Z'));
    mockDates.combineDateAndTime.mockReturnValue(
      new Date('2026-03-10T09:00:00.000Z'),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationStaffAttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: ReservationDateService, useValue: mockDates },
        { provide: ReservationSharedService, useValue: mockShared },
        { provide: ReservationQueriesService, useValue: mockQueries },
      ],
    }).compile();
    service = module.get(ReservationStaffAttendanceService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('potvrđuje dolazak za dodijeljenog stilista prije starta', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(confirmedClientRequired);
    mockShared.getStylistProfileIdByUserId.mockResolvedValue('sp-1');
    mockPrisma.reservation.update.mockResolvedValue({});
    const result = await service.confirmAttendanceByStaff('res-1', stylistUser);
    expect(result).toMatchObject({ id: 'res-1' });
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ATTENDANCE_CONFIRMED',
          attendanceConfirmedBy: 'STAFF',
        }),
      }),
    );
  });

  it('zabranjuje tuđem stilistu', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(confirmedClientRequired);
    mockShared.getStylistProfileIdByUserId.mockResolvedValue('sp-other');
    await expect(
      service.confirmAttendanceByStaff('res-1', stylistUser),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
  });

  it('odbija potvrdu na ili poslije starta', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(confirmedClientRequired);
    mockShared.getStylistProfileIdByUserId.mockResolvedValue('sp-1');
    jest.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));
    await expect(
      service.confirmAttendanceByStaff('res-1', stylistUser),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
  });

  it('odbija STAFF_WAIVED rezervacije', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...confirmedClientRequired,
      attendancePolicy: 'STAFF_WAIVED',
    });
    await expect(
      service.confirmAttendanceByStaff('res-1', adminUser),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
  });

  it('dozvoljava adminu bez stylist profila', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(confirmedClientRequired);
    mockPrisma.reservation.update.mockResolvedValue({});
    await service.confirmAttendanceByStaff('res-1', adminUser);
    expect(mockShared.getStylistProfileIdByUserId).not.toHaveBeenCalled();
    expect(mockPrisma.reservation.update).toHaveBeenCalled();
  });
});
