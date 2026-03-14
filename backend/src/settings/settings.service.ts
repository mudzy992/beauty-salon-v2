import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetSettingDto } from './dto/set-setting.dto';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async findAll() {
    return this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async findByKey(key: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException('Postavka nije pronađena.');
    return setting;
  }

  async getValue(key: string): Promise<string | null> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async set(key: string, dto: SetSettingDto, updatedBy?: string) {
    const result = await this.prisma.appSetting.upsert({
      where: { key },
      create: {
        key,
        value: dto.value,
        description: dto.description,
        updatedBy: updatedBy ?? null,
      },
      update: {
        value: dto.value,
        ...(dto.description !== undefined && { description: dto.description }),
        updatedBy: updatedBy ?? undefined,
      },
    });
    this.events.emitToAll(SOCKET_EVENTS.SETTINGS_UPDATED, { key, value: dto.value });
    return result;
  }

  async remove(key: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException('Postavka nije pronađena.');
    await this.prisma.appSetting.delete({ where: { key } });
    return { deleted: true };
  }
}
