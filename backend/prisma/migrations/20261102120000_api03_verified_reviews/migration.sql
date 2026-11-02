BEGIN;

-- Keep old app writes from racing the duplicate preflight and unique index.
LOCK TABLE "reviews" IN SHARE ROW EXCLUSIVE MODE;

-- Refuse to silently discard or merge duplicate historical booking reviews.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "reviews"
    WHERE "reservation_id" IS NOT NULL
    GROUP BY "reservation_id", "service_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'API-03 migration blocked: duplicate reviews exist for a reservation/service pair; owner review and cleanup plan are required before retrying.';
  END IF;
END $$;

-- Legacy reviews remain stored but start unverified and are excluded from public reads.
ALTER TABLE "reviews"
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;

-- PostgreSQL permits multiple NULL reservation IDs; app writes now require evidence.
CREATE UNIQUE INDEX "reviews_reservation_id_service_id_key"
ON "reviews"("reservation_id", "service_id");

COMMIT;
