-- Older descriptions were private and older photo consents did not authorize
-- their publication. Only an explicit opt-in stores an approved snapshot.
ALTER TABLE "daily_log_image_consents" ADD COLUMN "approved_description" TEXT;
