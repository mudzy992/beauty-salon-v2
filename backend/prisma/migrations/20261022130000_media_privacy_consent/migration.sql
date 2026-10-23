CREATE TYPE "UploadStorageClass" AS ENUM ('PRIVATE', 'PUBLIC', 'CONSENTED_PUBLIC');
CREATE TYPE "DailyLogMediaConsentPurpose" AS ENUM ('PUBLIC_GALLERY');
CREATE TYPE "DailyLogMediaConsentAction" AS ENUM ('GRANTED', 'REVOKED');

ALTER TABLE "uploads"
ADD COLUMN "storage_class" "UploadStorageClass" NOT NULL DEFAULT 'PRIVATE';

CREATE TABLE "daily_log_image_consents" (
    "id" TEXT NOT NULL,
    "daily_log_image_id" TEXT,
    "client_id" TEXT,
    "purpose" "DailyLogMediaConsentPurpose" NOT NULL DEFAULT 'PUBLIC_GALLERY',
    "policy_version" TEXT NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "published_upload_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_log_image_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_log_image_consent_events" (
    "id" TEXT NOT NULL,
    "consent_id" TEXT NOT NULL,
    "action" "DailyLogMediaConsentAction" NOT NULL,
    "actor_id" TEXT,
    "purpose" "DailyLogMediaConsentPurpose" NOT NULL DEFAULT 'PUBLIC_GALLERY',
    "policy_version" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CLIENT_APP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_log_image_consent_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_log_image_consents_daily_log_image_id_key"
ON "daily_log_image_consents"("daily_log_image_id");
CREATE UNIQUE INDEX "daily_log_image_consents_published_upload_id_key"
ON "daily_log_image_consents"("published_upload_id");
CREATE INDEX "daily_log_image_consents_client_id_revoked_at_idx"
ON "daily_log_image_consents"("client_id", "revoked_at");
CREATE INDEX "daily_log_image_consents_policy_version_revoked_at_idx"
ON "daily_log_image_consents"("policy_version", "revoked_at");
CREATE INDEX "daily_log_image_consent_events_consent_id_created_at_idx"
ON "daily_log_image_consent_events"("consent_id", "created_at");

ALTER TABLE "daily_log_image_consents"
ADD CONSTRAINT "daily_log_image_consents_daily_log_image_id_fkey"
FOREIGN KEY ("daily_log_image_id") REFERENCES "daily_log_images"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_log_image_consents"
ADD CONSTRAINT "daily_log_image_consents_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_log_image_consents"
ADD CONSTRAINT "daily_log_image_consents_published_upload_id_fkey"
FOREIGN KEY ("published_upload_id") REFERENCES "uploads"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_log_image_consent_events"
ADD CONSTRAINT "daily_log_image_consent_events_consent_id_fkey"
FOREIGN KEY ("consent_id") REFERENCES "daily_log_image_consents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_log_image_consent_events"
ADD CONSTRAINT "daily_log_image_consent_events_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
