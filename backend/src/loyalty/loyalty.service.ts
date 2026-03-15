import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.loyaltyAccount.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    return account;
  }

  async updateActive(id: string, isActive: boolean) {
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    return this.prisma.loyaltyAccount.update({
      where: { id },
      data: { isActive },
      include: {
        user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}
