-- Visibility affects gallery discovery only; originals and consent remain unchanged.
ALTER TABLE "daily_log_entries" ADD COLUMN "work_gallery_hidden" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "daily_log_entries_work_gallery_hidden_idx" ON "daily_log_entries" ("service_id", "work_gallery_hidden", "completed_at", "id");
