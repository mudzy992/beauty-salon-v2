import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '@prisma/client'

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } })
  }

  findManyByKeys(keys: string[]) {
    return this.prisma.appSetting.findMany({
      where: { key: { in: keys } },
      orderBy: { key: 'asc' },
      select: { key: true, value: true },
    })
  }

  findByKey(key: string) {
    return this.prisma.appSetting.findUnique({ where: { key } })
  }

  upsertByKey(params: Prisma.AppSettingUpsertArgs) {
    return this.prisma.appSetting.upsert(params)
  }

  deleteByKey(key: string) {
    return this.prisma.appSetting.delete({ where: { key } })
  }
}
