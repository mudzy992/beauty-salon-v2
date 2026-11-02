jest.mock('@prisma/client', () => ({ Prisma: { sql: jest.fn() } }));
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { IncomeBookRepository } from './income-book.repository';
import { createFinancePrismaMock } from '../testing/prisma-mock';

describe('IncomeBookRepository', () => {
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
