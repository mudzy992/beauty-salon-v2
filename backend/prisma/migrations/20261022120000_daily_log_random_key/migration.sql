-- Add a stable per-entry random key so public random gallery selection can seek
-- from a random point in an indexed order without loading every eligible ID.
ALTER TABLE "daily_log_entries"
ADD COLUMN "random_key" DOUBLE PRECISION NOT NULL DEFAULT random();

CREATE INDEX "daily_log_entries_random_key_id_idx"
ON "daily_log_entries"("random_key", "id");
