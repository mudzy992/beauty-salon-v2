-- BIZ-03: reject ambiguous legacy financial rows before installing the
-- idempotency guarantees. This migration never selects, deletes, or rewrites a
-- duplicate as a winner; run the read-only completion reconciliation first.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "income_book_entries"
    GROUP BY "daily_log_entry_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'BIZ-03 preflight failed: duplicate KIF rows exist for a daily-log entry; review the read-only completion reconciliation before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "loyalty_transactions"
    WHERE "type" = 'EARN'
      AND LEFT("source", LENGTH('daily_log:')) = 'daily_log:'
    GROUP BY "source"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'BIZ-03 preflight failed: duplicate daily-log loyalty EARN rows exist; review the read-only completion reconciliation before migration';
  END IF;
END
$migration$;

ALTER TABLE "daily_log_entries"
  ADD COLUMN "completion_version" INTEGER NOT NULL DEFAULT 0;

-- Existing completed rows are one completion generation. New completions
-- increment this value; an HTTP retry keeps the same version and outbox key.
UPDATE "daily_log_entries"
SET "completion_version" = 1
WHERE "status" = 'COMPLETED';

ALTER TABLE "loyalty_transactions"
  ADD COLUMN "idempotency_key" TEXT;

-- Preserve an existing earn as generation one so a retry of a legacy completed
-- row does not award points again. Unmatched ledger rows remain untouched and
-- are visible to reconciliation.
UPDATE "loyalty_transactions" AS lt
SET "idempotency_key" = 'daily-log.earn:' || dl."id" || ':v' || GREATEST(dl."completion_version", 1)::TEXT
FROM "daily_log_entries" AS dl
WHERE lt."type" = 'EARN'
  AND lt."source" = 'daily_log:' || dl."id";

CREATE UNIQUE INDEX "loyalty_transactions_idempotency_key_key"
  ON "loyalty_transactions" ("idempotency_key");

-- One daily-log entry has exactly one auto KIF row globally, which matches the
-- one-to-one Prisma relation and prevents duplicates across different books.
DROP INDEX "income_book_entries_book_id_daily_log_entry_id_key";

CREATE UNIQUE INDEX "income_book_entries_daily_log_entry_id_key"
  ON "income_book_entries" ("daily_log_entry_id");
