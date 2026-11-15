CREATE TABLE "stylist_financial_transfer_audits" (
  "id" TEXT NOT NULL,
  "source_user_id" TEXT NOT NULL,
  "source_profile_id" TEXT NOT NULL,
  "target_profile_id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "debt_ids" JSONB NOT NULL,
  "manual_income_ids" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stylist_financial_transfer_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stylist_fin_transfer_source_created_idx" ON "stylist_financial_transfer_audits"("source_user_id", "created_at");
CREATE INDEX "stylist_fin_transfer_actor_created_idx" ON "stylist_financial_transfer_audits"("actor_user_id", "created_at");
