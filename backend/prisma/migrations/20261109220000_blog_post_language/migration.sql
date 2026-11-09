-- WCAG 3.1.2 (Language of Parts, AA): jezik članka bloga mora biti programski
-- odredljiv da bi javna stranica mogla izdati `lang` na sadržaju. Bez toga čitač
-- ekrana čita engleski članak bosanskom fonetikom (i obrnuto).
--
-- Postojećim redovima se upisuje 'bs' jer je to jezik sajta
-- (frontend/index.html -> <html lang="bs">).
ALTER TABLE "blog_posts"
ADD COLUMN "language" VARCHAR(8) NOT NULL DEFAULT 'bs';
