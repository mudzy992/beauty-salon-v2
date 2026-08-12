import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

@Injectable()
export class AvailabilityDebugService {
  constructor(private readonly prisma: PrismaService) {}

  async debugAvailability(serviceId: string) {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) return { error: 'Salon nije konfigurisan' };

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true },
    });
    if (!service) return { error: 'Servis nije pronađen', serviceId };

    const stylistServiceRows = await this.prisma.stylistService.findMany({
      where: { serviceId },
      include: {
        stylistProfile: {
          select: {
            id: true,
            isActive: true,
            userId: true,
            user: {
              select: { username: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const stylistIds = stylistServiceRows.map((r) => r.stylistProfileId);

    const salonHours = await this.prisma.salonWorkingHours.findMany({
      where: { salonSettingsId: salon.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    let stylistWorkingHours: any[] = [];
    if (stylistIds.length > 0) {
      stylistWorkingHours = await this.prisma.stylistWorkingHours.findMany({
        where: { stylistProfileId: { in: stylistIds } },
        orderBy: [{ dayOfWeek: 'asc' }],
      });
    }

    const allStylistProfiles = await this.prisma.stylistProfile.findMany({
      select: {
        id: true,
        isActive: true,
        userId: true,
        user: { select: { username: true } },
        _count: { select: { stylistServices: true, workingHours: true } },
      },
    });

    return {
      salon: { id: salon.id, name: salon.name },
      service: { id: service.id, name: service.name },
      salonWorkingHours: salonHours.map((wh) => ({
        day: DAYS[wh.dayOfWeek],
        dayOfWeek: wh.dayOfWeek,
        openTime: wh.openTime,
        closeTime: wh.closeTime,
        isWorkingDay: wh.isWorkingDay,
      })),
      stylistsLinkedToService: stylistServiceRows.map((r) => ({
        stylistProfileId: r.stylistProfileId,
        isActive: r.stylistProfile.isActive,
        user: r.stylistProfile.user,
      })),
      stylistWorkingHoursForLinkedStylists: stylistWorkingHours.map(
        (wh: any) => ({
          stylistProfileId: wh.stylistProfileId,
          day: DAYS[wh.dayOfWeek],
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
          isWorkingDay: wh.isWorkingDay,
          dateOverride: wh.dateOverride,
        }),
      ),
      allStylistProfiles: allStylistProfiles.map((sp) => ({
        id: sp.id,
        username: sp.user.username,
        isActive: sp.isActive,
        serviceCount: sp._count.stylistServices,
        workingHoursCount: sp._count.workingHours,
      })),
      diagnosis: this.buildDiagnosis(salonHours, stylistIds, stylistWorkingHours),
    };
  }

  private buildDiagnosis(
    salonHours: Array<{ isWorkingDay: boolean; dayOfWeek: number }>,
    stylistIds: string[],
    stylistWorkingHours: any[],
  ) {
    return {
      hasSalon: true,
      hasService: true,
      hasSalonWorkingHours: salonHours.length > 0,
      salonWorkingDays: salonHours
        .filter((wh) => wh.isWorkingDay)
        .map((wh) => DAYS[wh.dayOfWeek]),
      stylistsForThisService: stylistIds.length,
      stylistWorkingHoursCount: stylistWorkingHours.length,
      stylistWorkingDays: [
        ...new Set(
          stylistWorkingHours
            .filter((wh: any) => wh.isWorkingDay && !wh.dateOverride)
            .map((wh: any) => DAYS[wh.dayOfWeek]),
        ),
      ],
      issue:
        salonHours.length === 0
          ? 'NO_SALON_WORKING_HOURS'
          : salonHours.filter((wh) => wh.isWorkingDay).length === 0
            ? 'ALL_SALON_DAYS_DISABLED'
            : stylistIds.length === 0
              ? 'NO_STYLISTS_FOR_SERVICE'
              : stylistWorkingHours.length === 0
                ? 'NO_STYLIST_WORKING_HOURS'
                : stylistWorkingHours.filter((wh: any) => wh.isWorkingDay)
                      .length === 0
                  ? 'ALL_STYLIST_DAYS_DISABLED'
                  : 'NONE_DETECTED',
    };
  }
}
