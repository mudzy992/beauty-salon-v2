DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "daily_log_entries"
    WHERE "reservation_id" IS NOT NULL
      AND "kind" = 'SERVICE'
    GROUP BY "reservation_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one SERVICE daily-log entry per reservation: duplicate groups exist. Run the documented read-only preflight and resolve duplicates by owner decision.';
  END IF;
END $$;

CREATE UNIQUE INDEX "daily_log_entries_reservation_service_unique_idx"
  ON "daily_log_entries" ("reservation_id")
  WHERE "reservation_id" IS NOT NULL
    AND "kind" = 'SERVICE';
