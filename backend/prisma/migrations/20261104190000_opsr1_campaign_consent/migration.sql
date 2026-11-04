BEGIN;

-- No historical account is implicitly opted in. Eligibility requires an explicit
-- opted_in=true row and a verified email. Active filtering remains user-selectable
-- with the existing audience default of active accounts only.
CREATE TABLE "campaign_email_consents" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "opted_in" BOOLEAN NOT NULL DEFAULT false,
  "consented_at" TIMESTAMP(3),
  "withdrawn_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaign_email_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campaign_email_consents_user_id_key"
  ON "campaign_email_consents"("user_id");
CREATE INDEX "campaign_email_consents_opted_in_updated_at_idx"
  ON "campaign_email_consents"("opted_in", "updated_at");

ALTER TABLE "campaign_email_consents"
  ADD CONSTRAINT "campaign_email_consents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "campaign_email_consent_events" (
  "id" TEXT NOT NULL,
  "consent_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_email_consent_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_email_consent_events_consent_id_idx"
  ON "campaign_email_consent_events"("consent_id");
CREATE INDEX "campaign_email_consent_events_user_id_occurred_at_idx"
  ON "campaign_email_consent_events"("user_id", "occurred_at");

ALTER TABLE "campaign_email_consent_events"
  ADD CONSTRAINT "campaign_email_consent_events_consent_id_fkey"
  FOREIGN KEY ("consent_id") REFERENCES "campaign_email_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "campaign_email_consent_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
