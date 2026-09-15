export const expenseBookItemInclude = {
  category: { include: { template: { include: { fields: true } } } },
  fieldValues: { include: { field: true } },
  attachments: { include: { upload: true } },
} as const;

export const expenseBookExpensesInclude = {
  expenses: { include: expenseBookItemInclude },
} as const;

export const expenseBookDetailInclude = {
  ...expenseBookExpensesInclude,
  lockEvents: {
    include: { createdBy: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;
