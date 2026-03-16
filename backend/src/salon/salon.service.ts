import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { CreateSalonSettingsDto } from './dto/create-salon-settings.dto';
import { UpdateSalonSettingsDto } from './dto/update-salon-settings.dto';
import { WorkingHoursDto } from './dto/working-hours.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class SalonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async findAll() {
    return this.prisma.salonSettings.findMany({
      include: { workingHours: true, holidays: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const salon = await this.prisma.salonSettings.findUnique({
      where: { id },
      include: { workingHours: true, holidays: { orderBy: { date: 'asc' } } },
    });
    if (!salon) throw new NotFoundException('Salon nije pronađen.');
    return salon;
  }

  async findFirst() {
    const salon = await this.prisma.salonSettings.findFirst({
      include: {
        workingHours: true,
        holidays: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
        },
      },
    });
    return salon;
  }

  async create(dto: CreateSalonSettingsDto) {
    const salon = await this.prisma.salonSettings.create({
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        description: dto.description,
        logo: dto.logo,
        pauseBetweenServices: dto.pauseBetweenServices ?? 10,
        cancellationDeadlineHours: dto.cancellationDeadlineHours ?? 24,
        maxCancellationsBeforePenalty: dto.maxCancellationsBeforePenalty ?? 3,
        penaltyDurationDays: dto.penaltyDurationDays ?? 30,
        reservationLockMinutes: dto.reservationLockMinutes ?? 15,
      },
    });
    if (dto.workingHours?.length) {
      await this.setWorkingHours(salon.id, dto.workingHours);
    } else {
      await this.setWorkingHours(salon.id, this.getDefaultWorkingHours());
    }
    return this.findOne(salon.id);
  }

  async ensureWorkingHoursExist(salonSettingsId: string) {
    const existing = await this.prisma.salonWorkingHours.count({
      where: { salonSettingsId },
    });
    if (existing === 0) {
      await this.setWorkingHours(
        salonSettingsId,
        this.getDefaultWorkingHours(),
      );
    }
    return this.getWorkingHours(salonSettingsId);
  }

  private getDefaultWorkingHours(): WorkingHoursDto[] {
    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      openTime: '09:00',
      closeTime: '17:00',
      isWorkingDay: i >= 1 && i <= 5,
    }));
  }

  async update(id: string, dto: UpdateSalonSettingsDto) {
    await this.findOne(id);
    await this.prisma.salonSettings.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.pauseBetweenServices != null && {
          pauseBetweenServices: dto.pauseBetweenServices,
        }),
        ...(dto.cancellationDeadlineHours != null && {
          cancellationDeadlineHours: dto.cancellationDeadlineHours,
        }),
        ...(dto.maxCancellationsBeforePenalty != null && {
          maxCancellationsBeforePenalty: dto.maxCancellationsBeforePenalty,
        }),
        ...(dto.penaltyDurationDays != null && {
          penaltyDurationDays: dto.penaltyDurationDays,
        }),
        ...(dto.reservationLockMinutes != null && {
          reservationLockMinutes: dto.reservationLockMinutes,
        }),
      },
    });
    if (dto.workingHours) {
      await this.setWorkingHours(id, dto.workingHours);
    }
    const updated = await this.findOne(id);
    this.events.emitToAll(SOCKET_EVENTS.SALON_UPDATED, updated);
    return updated;
  }

  async setWorkingHours(salonSettingsId: string, hours: WorkingHoursDto[]) {
    await this.findOne(salonSettingsId);
    await this.prisma.salonWorkingHours.deleteMany({
      where: { salonSettingsId },
    });
    if (hours.length) {
      await this.prisma.salonWorkingHours.createMany({
        data: hours.map((h) => ({
          salonSettingsId,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isWorkingDay: h.isWorkingDay ?? true,
        })),
      });
    }
    return this.prisma.salonWorkingHours.findMany({
      where: { salonSettingsId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getWorkingHours(salonSettingsId: string) {
    await this.findOne(salonSettingsId);
    return this.prisma.salonWorkingHours.findMany({
      where: { salonSettingsId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async addHoliday(salonSettingsId: string, dto: CreateHolidayDto) {
    await this.findOne(salonSettingsId);
    return this.prisma.holiday.create({
      data: {
        salonSettingsId,
        date: new Date(dto.date),
        name: dto.name,
        message: dto.message,
        sendPush: dto.sendPush ?? false,
      },
    });
  }

  async updateHoliday(holidayId: string, dto: UpdateHolidayDto) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id: holidayId },
    });
    if (!holiday) throw new NotFoundException('Praznik nije pronađen.');
    return this.prisma.holiday.update({
      where: { id: holidayId },
      data: {
        ...(dto.date != null && { date: new Date(dto.date) }),
        ...(dto.name != null && { name: dto.name }),
        ...(dto.message !== undefined && { message: dto.message }),
        ...(dto.sendPush !== undefined && { sendPush: dto.sendPush }),
      },
    });
  }

  async removeHoliday(holidayId: string) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id: holidayId },
    });
    if (!holiday) throw new NotFoundException('Praznik nije pronađen.');
    await this.prisma.holiday.delete({ where: { id: holidayId } });
    return { deleted: true };
  }
}
