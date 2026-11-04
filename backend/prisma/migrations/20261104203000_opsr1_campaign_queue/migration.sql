BEGIN;

CREATE TABLE "campaign_jobs" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "template_name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "template_html" TEXT NOT NULL,
  "app_url" TEXT NOT NULL,
  "campaign_name" TEXT,
  "tags" JSONB NOT NULL,
  "create_in_app_notification" BOOLEAN NOT NULL DEFAULT true,
  "requested_by_user_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "total_recipients" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaign_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campaign_jobs_requested_by_user_id_idempotency_key_key"
  ON "campaign_jobs"("requested_by_user_id", "idempotency_key");
CREATE INDEX "campaign_jobs_status_created_at_idx"
  ON "campaign_jobs"("status", "created_at");

CREATE TABLE "campaign_recipients" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "first_name" TEXT,
  "last_name" TEXT,
  "consent_id" TEXT NOT NULL,
  "consented_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "attempted_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_recipients_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "campaign_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "campaign_recipients_job_id_user_id_key"
  ON "campaign_recipients"("job_id", "user_id");
CREATE INDEX "campaign_recipients_job_id_status_created_at_idx"
  ON "campaign_recipients"("job_id", "status", "created_at");

CREATE TABLE "campaign_job_retry_audits" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "requested_by_user_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "confirmed_at_least_once" BOOLEAN NOT NULL,
  "affected_recipients" INTEGER NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_job_retry_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_job_retry_audits_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "campaign_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "campaign_job_retry_audits_job_id_request_id_key"
  ON "campaign_job_retry_audits"("job_id", "request_id");
CREATE INDEX "campaign_job_retry_audits_requested_by_user_id_requested_at_idx"
  ON "campaign_job_retry_audits"("requested_by_user_id", "requested_at");

CREATE TABLE "campaign_worker_locks" (
  "id" TEXT NOT NULL,
  "locked_by" TEXT,
  "locked_until" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaign_worker_locks_pkey" PRIMARY KEY ("id")
);

INSERT INTO "campaign_worker_locks" ("id", "locked_by", "locked_until")
VALUES ('global-campaign-email-sender', NULL, TIMESTAMP '1970-01-01 00:00:00');

COMMIT;
