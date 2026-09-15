-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN "excerpt" TEXT,
ADD COLUMN "og_image" TEXT,
ADD COLUMN "seo_title" VARCHAR(70),
ADD COLUMN "seo_description" VARCHAR(320),
ADD COLUMN "no_index" BOOLEAN NOT NULL DEFAULT false;
