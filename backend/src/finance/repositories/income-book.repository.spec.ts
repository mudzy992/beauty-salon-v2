jest.mock('@prisma/client', () => ({ Prisma: { sql: jest.fn() } }));
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { IncomeBookRepository } from './income-book.repository';
import { createFinancePrismaMock } from '../testing/prisma-mock';

describe('IncomeBookRepository', () => {
  it('annotates eligibility without mistaking another stylist or a deactivated service for support', async () => {
    const prisma = createFinancePrismaMock();
    prisma.incomeBook.findUnique.mockResolvedValue({ id: 'book-1', manualEntries: [
      { id: 'supported', serviceId: 's1', stylistProfileId: 'st1', service: { isActive: true } },
      { id: 'unassigned', serviceId: 's2', stylistProfileId: 'st1', service: { isActive: true } },
      { id: 'inactive', serviceId: 's3', stylistProfileId: 'st1', service: { isActive: false } },
      { id: 'legacy', serviceId: 's4', stylistProfileId: null, service: { isActive: true } },
    ] });
    prisma.stylistService.findMany.mockResolvedValue([
      { stylistProfileId: 'st1', serviceId: 's1' },
      { stylistProfileId: 'st2', serviceId: 's2' },
      { stylistProfileId: 'st1', serviceId: 's3' },
    ]);
    const repository = new IncomeBookRepository(prisma as never);
    const book = await repository.findDetail('book-1');
    expect(book?.manualEntries.map(entry => [entry.id, entry.canEditOriginalService])).toEqual([
      ['supported', true], ['unassigned', false], ['inactive', false], ['legacy', true],
    ]);
  });

  it('projects stylist user fields in both automatic and manual KIF detail rows', async () => {
    const prisma = createFinancePrismaMock();
    prisma.incomeBook.findUnique.mockResolvedValue(null);
    const repository = new IncomeBookRepository(prisma as never);

    await repository.findDetail('book-1');

    const query = prisma.incomeBook.findUnique.mock.calls[0]![0];
    const expectedUserSelect = {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    };
    expect(
      query.include.entries.include.dailyLogEntry.include.stylistProfile,
    ).toEqual({
      include: { user: { select: expectedUserSelect } },
    });
    expect(query.include.manualEntries.include.stylistProfile).toEqual({
      include: { user: { select: expectedUserSelect } },
    });
    expect(repository.manualEntryInclude.stylistProfile).toEqual({
      include: { user: { select: expectedUserSelect } },
    });
  });
});
