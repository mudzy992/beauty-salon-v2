export const financeKeys = {
  all: ['finance'] as const,
  incomeBooks: () => [...financeKeys.all, 'income-books'] as const,
  incomeBook: (id: string) => [...financeKeys.all, 'income-book', id] as const,
  incomeBookMonth: (year: number, month: number) =>
    [...financeKeys.all, 'income-book-month', year, month] as const,
  incomeIntegrity: (id: string) =>
    [...financeKeys.all, 'income-integrity', id] as const,
  expenseBooks: () => [...financeKeys.all, 'expense-books'] as const,
  expenseBook: (id: string) => [...financeKeys.all, 'expense-book', id] as const,
  expenseCategories: () => [...financeKeys.all, 'expense-categories'] as const,
  expenseTemplates: () => [...financeKeys.all, 'expense-templates'] as const,
  stylists: () => [...financeKeys.all, 'stylists'] as const,
  stylistServices: (stylistProfileId: string) =>
    [...financeKeys.all, 'stylist-services', stylistProfileId] as const,
  clientSearch: (query: string) =>
    [...financeKeys.all, 'client-search', query] as const,
  clientDebts: (clientId: string) =>
    [...financeKeys.all, 'client-debts', clientId] as const,
}
