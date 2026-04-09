import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientDebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForClient(clientId: string, currentUser: { sub: string; roles: string[] }) {
    if (!clientId) throw new BadRequestException('clientId je obavezan.');
    const isAdminOrOwner = currentUser.roles.includes('SYSTEM_ADMIN') || currentUser.roles.includes('OWNER');
    const isStylist = currentUser.roles.includes('STYLIST');
    if (!isAdminOrOwner && !isStylist) throw new ForbiddenException('Nemate dozvolu.');

    const debts = await this.prisma.clientDebt.findMany({
      where: { clientId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { id: true, name: true } },
        stylistProfile: {
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true } },
          },
        },
        createdBy: { select: { id: true, username: true } },
        settledBy: { select: { id: true, username: true } },
      },
    });

    if (isAdminOrOwner) return debts;

    // STYLIST: može vidjeti dugove klijenta zbog operativnih poruka u toku rada,
    // ali ne smije vidjeti tuđe napomene.
    return debts.map((d) => (d.createdById === currentUser.sub ? d : { ...d, note: null }));
  }

  async settle(debtId: string, currentUser: { sub: string; roles: string[] }, note?: string) {
    const debt = await this.prisma.clientDebt.findUnique({ where: { id: debtId } });
    if (!debt) throw new NotFoundException('Dug nije pronađen.');
    if (debt.status !== 'OPEN') throw new BadRequestException('Dug je već zatvoren.');

    const isAdminOrOwner = currentUser.roles.includes('SYSTEM_ADMIN') || currentUser.roles.includes('OWNER');
    if (!isAdminOrOwner) {
      if (!currentUser.roles.includes('STYLIST')) throw new ForbiddenException('Nemate dozvolu.');
      if (debt.createdById !== currentUser.sub) throw new ForbiddenException('Nemate dozvolu.');
    }

    return this.prisma.clientDebt.update({
      where: { id: debtId },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        settledById: currentUser.sub,
        ...(note != null ? { note } : {}),
      },
    });
  }
}

