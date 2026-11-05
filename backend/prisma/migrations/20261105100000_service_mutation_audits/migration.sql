CREATE TABLE "service_mutation_audits" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "source_service_id" TEXT NOT NULL,
  "source_service_name" TEXT NOT NULL,
  "target_service_id" TEXT,
  "target_service_name" TEXT,
  "actor_user_id" TEXT NOT NULL,
  "impact" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_mutation_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_mutation_audits_source_created_idx"
  ON "service_mutation_audits"("source_service_id", "created_at");

CREATE INDEX "service_mutation_audits_actor_created_idx"
  ON "service_mutation_audits"("actor_user_id", "created_at");
