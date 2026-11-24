-- Manual order affects only the service-filtered work feed; NULL keeps chronological order.
CREATE TABLE "work_gallery_order_state" (
  "service_id" TEXT NOT NULL PRIMARY KEY REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "revision" TEXT NOT NULL DEFAULT '0'
);
ALTER TABLE "daily_log_entries" ADD COLUMN "work_gallery_sort_order" INTEGER;
CREATE INDEX "daily_log_entries_work_gallery_order_idx" ON "daily_log_entries" ("service_id", "work_gallery_hidden", "work_gallery_sort_order", "completed_at", "id");
