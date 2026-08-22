-- Data fix: IncomeBookEntry.amount historically stored actualPrice (tip included).
-- Convention: amount = service revenue (excludes tip), tipAmount = tip.
-- One-shot; do not re-run manually.

UPDATE income_book_entries
SET amount = amount - tip_amount
WHERE tip_amount > 0;

UPDATE income_books b
SET
  total_revenue = (
    SELECT COALESCE(SUM(e.amount), 0)
    FROM income_book_entries e
    WHERE e.book_id = b.id
  ) + (
    SELECT COALESCE(SUM(m.amount), 0)
    FROM income_book_manual_entries m
    WHERE m.book_id = b.id
  ),
  total_tips = (
    SELECT COALESCE(SUM(e.tip_amount), 0)
    FROM income_book_entries e
    WHERE e.book_id = b.id
  ) + (
    SELECT COALESCE(SUM(m.tip_amount), 0)
    FROM income_book_manual_entries m
    WHERE m.book_id = b.id
  );
