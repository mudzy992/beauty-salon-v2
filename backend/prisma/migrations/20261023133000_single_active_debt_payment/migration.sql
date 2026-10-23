-- Refuse to choose a winner if legacy data already contains duplicate active
-- payments. Reconcile those rows explicitly before deployment; do not delete or
-- rewrite financial history automatically.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "daily_log_entries"
    WHERE "kind" = 'DEBT_PAYMENT'
      AND "debt_id" IS NOT NULL
      AND "deleted_at" IS NULL
    GROUP BY "debt_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one active debt payment: duplicate active DEBT_PAYMENT rows exist. Reconcile them before retrying this migration.';
  END IF;

  EXECUTE $index$
    CREATE UNIQUE INDEX "daily_log_entries_one_active_debt_payment_per_debt_idx"
      ON "daily_log_entries" ("debt_id")
      WHERE "kind" = 'DEBT_PAYMENT'
        AND "debt_id" IS NOT NULL
        AND "deleted_at" IS NULL
  $index$;
END
$migration$;
