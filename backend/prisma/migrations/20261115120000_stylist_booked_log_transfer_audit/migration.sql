ALTER TABLE "stylist_financial_transfer_audits" ADD COLUMN "booked_daily_log_ids" JSONB NOT NULL DEFAULT '[]'::jsonb;
