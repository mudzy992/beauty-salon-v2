-- Opaque optimistic-concurrency token; rotated atomically on each visibility change.
ALTER TABLE "daily_log_entries" ADD COLUMN "work_gallery_revision" TEXT NOT NULL DEFAULT '0';
