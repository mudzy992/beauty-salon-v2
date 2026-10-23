ALTER TABLE "users"
ADD COLUMN "is_avatar_public" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "gallery_categories"
ADD COLUMN "auto_publish_consented_pairs" BOOLEAN NOT NULL DEFAULT FALSE;

-- Multiple manual categories remain allowed, but only one category may receive
-- automatically published consented before/after pairs at a time.
CREATE UNIQUE INDEX "gallery_categories_single_auto_publish_idx"
ON "gallery_categories" ("auto_publish_consented_pairs")
WHERE "auto_publish_consented_pairs" = TRUE;
