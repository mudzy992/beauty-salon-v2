-- Existing monthly expenses have no reliable transaction date. Preserve their
-- origin as estimated so a first-of-month backfill is never presented as fact.
ALTER TABLE "expenses" ADD COLUMN "expense_date" DATE;
ALTER TABLE "expenses" ADD COLUMN "date_estimated" BOOLEAN NOT NULL DEFAULT false;
UPDATE "expenses" AS e SET "expense_date" = make_date(b."year", b."month", 1), "date_estimated" = true
FROM "expense_books" AS b WHERE b."id" = e."book_id";
ALTER TABLE "expenses" ALTER COLUMN "expense_date" SET NOT NULL;
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");
