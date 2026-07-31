const model = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
})

export type FinancePrismaMock = ReturnType<typeof createFinancePrismaMock>

/** Prisma dvojnik za finance servise; `$transaction` izvršava callback nad istim mockom. */
export const createFinancePrismaMock = () => {
  const mock = {
    $transaction: jest.fn(),
    service: model(),
    incomeBook: model(),
    incomeBookEntry: model(),
    incomeBookManualEntry: model(),
    incomeBookManualEntryAudit: model(),
    expense: model(),
    expenseBook: model(),
    expenseCategory: model(),
    expenseFieldValue: model(),
    expenseAttachment: model(),
    expenseTemplateField: model(),
    clientDebt: model(),
    dailyLogEntry: model(),
    stylistProfile: model(),
  }
  mock.$transaction.mockImplementation(
    async (fn: (tx: typeof mock) => unknown) => fn(mock),
  )
  return mock
}
