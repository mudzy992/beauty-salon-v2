export function withTotalExpenses<T extends { expenses?: Array<{ totalAmount: unknown }> }>(
  book: T,
): T & { totalExpenses: number } {
  const totalExpenses = (book.expenses ?? []).reduce(
    (sum, item) => sum + Number(item.totalAmount ?? 0),
    0,
  );
  return { ...book, totalExpenses };
}
