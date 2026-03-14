import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStylistProfileDto } from './dto/create-stylist-profile.dto';
import { UpdateStylistProfileDto } from './dto/update-stylist-profile.dto';
import { StylistWorkingHoursDto } from './dto/stylist-working-hours.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class StylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.stylistProfile.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, avatar: true } },
        workingHours: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        stylistServices: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser?: CurrentUserPayload) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, phone: true, avatar: true } },
        workingHours: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        stylistServices: { include: { service: { include: { subcategory: { include: { category: true } } } } } },
      },
    });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    return stylist;
  }

  async findByUserId(userId: string) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, avatar: true } },
        workingHours: { orderBy: [{ dayOfWeek: 'asc' }] },
        stylistServices: { include: { service: true } },
      },
    });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    return stylist;
  }

  async create(dto: CreateStylistProfileDto, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const existing = await this.prisma.stylistProfile.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ForbiddenException('Korisnik već ima profil stilista.');
    const stylist = await this.prisma.stylistProfile.create({
      data: {
        userId: dto.userId,
        bio: dto.bio,
        specialization: dto.specialization,
        isActive: dto.isActive ?? true,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Automatski dodjeli STYLIST rolu korisniku (ne može se ručno u User managementu)
    const stylistRole = await this.prisma.role.findUnique({ where: { name: 'STYLIST' } });
    if (stylistRole) {
      const existingUserRole = await this.prisma.userRole.findFirst({
        where: { userId: dto.userId, roleId: stylistRole.id },
      });
      if (!existingUserRole) {
        await this.prisma.userRole.create({
          data: { userId: dto.userId, roleId: stylistRole.id },
        });
      }
    }

    if (dto.serviceIds?.length) {
      await this.setServices(stylist.id, dto.serviceIds);
    }
    if (dto.workingHours?.length) {
      await this.setWorkingHours(stylist.id, dto.workingHours);
    }
    return this.findOne(stylist.id);
  }

  async update(id: string, dto: UpdateStylistProfileDto, currentUser: CurrentUserPayload) {
    const stylist = await this.prisma.stylistProfile.findUnique({ where: { id } });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    if (currentUser.sub !== stylist.userId && !this.isAdminOrOwner(currentUser.roles)) {
      throw new ForbiddenException('Nemate dozvolu za izmjenu ovog profila.');
    }
    await this.prisma.stylistProfile.update({
      where: { id },
      data: {
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.specialization !== undefined && { specialization: dto.specialization }),
        ...(this.isAdminOrOwner(currentUser.roles) && dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.hireDate !== undefined && { hireDate: dto.hireDate ? new Date(dto.hireDate) : null }),
      },
    });
    if (dto.serviceIds) await this.setServices(id, dto.serviceIds);
    if (dto.workingHours) await this.setWorkingHours(id, dto.workingHours);
    return this.findOne(id);
  }

  async remove(id: string, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const stylist = await this.prisma.stylistProfile.findUnique({ where: { id } });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    const userId = stylist.userId;
    await this.prisma.stylistProfile.delete({ where: { id } });
    // Ukloni STYLIST rolu korisniku kad više nema profil stilista
    const stylistRole = await this.prisma.role.findUnique({ where: { name: 'STYLIST' } });
    if (stylistRole) {
      await this.prisma.userRole.deleteMany({
        where: { userId, roleId: stylistRole.id },
      });
    }
    return { deleted: true };
  }

  async setWorkingHours(stylistProfileId: string, hours: StylistWorkingHoursDto[]) {
    await this.findOne(stylistProfileId);
    await this.prisma.stylistWorkingHours.deleteMany({ where: { stylistProfileId } });
    if (hours.length) {
      await this.prisma.stylistWorkingHours.createMany({
        data: hours.map((h) => ({
          stylistProfileId,
          dayOfWeek: h.dayOfWeek,
          dateOverride: h.dateOverride ? new Date(h.dateOverride) : null,
          startTime: h.startTime,
          endTime: h.endTime,
          isWorkingDay: h.isWorkingDay ?? true,
        })),
      });
    }
    return this.prisma.stylistWorkingHours.findMany({
      where: { stylistProfileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getWorkingHours(stylistProfileId: string) {
    await this.findOne(stylistProfileId);
    return this.prisma.stylistWorkingHours.findMany({
      where: { stylistProfileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async setServices(stylistProfileId: string, serviceIds: string[]) {
    await this.findOne(stylistProfileId);
    await this.prisma.stylistService.deleteMany({ where: { stylistProfileId } });
    if (serviceIds.length) {
      await this.prisma.stylistService.createMany({
        data: serviceIds.map((serviceId) => ({ stylistProfileId, serviceId })),
      });
    }
    return this.prisma.stylistService.findMany({
      where: { stylistProfileId },
      include: { service: true },
    });
  }

  async getServices(stylistProfileId: string) {
    await this.findOne(stylistProfileId);
    return this.prisma.stylistService.findMany({
      where: { stylistProfileId },
      include: { service: { include: { subcategory: { include: { category: true } } } } },
    });
  }

  private isAdminOrOwner(roles: string[]) {
    return roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER');
  }

  private requireAdminOrOwner(roles: string[]) {
    if (!this.isAdminOrOwner(roles)) throw new ForbiddenException('Samo administrator ili vlasnik.');
  }
}
