import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '@prisma/client'

@Injectable()
export class UploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: Prisma.UploadCreateArgs) {
    return this.prisma.upload.create(params)
  }

  findFirstByPathOriginal(pathOriginal: string) {
    return this.prisma.upload.findFirst({ where: { pathOriginal } })
  }

  deleteById(id: string) {
    return this.prisma.upload.delete({ where: { id } })
  }
}
