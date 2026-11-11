# S3 — Javni sadržaj: Blog, Galerija, Kontakt, Zadovoljni klijenti

**Status:** ✅ **ZAVRŠEN** — odobrenje `approve_s3`; kod `a12cf5b` (`a12cf5b3a169d8315fb1c1bd23b522178ab1022f`) · CI run **`43116167107` = 5/5 success** · režim: plan → implementacija → 5/5 CI → evidencija → **STOP**. **Obuhvata 5 javnih ruta + dijeljene blog komponente.**

---

## 1. Cilj

Refaktor sadržajnog dijela javnog sajta prema NEJRA §07/§09/§11: blog lista + članak + komentari + share, galerija s lightboxom, kontakt, stranica zadovoljnih klijenata. Ista pravila: 3 stanja teme, semantički tokeni, jedan CTA po ekranu, prazna/loading/error stanja s retry, reflow, a11y, i18n paritet — **bez ikakve promjene podataka ni API ugovora**.

---

## 2. Ulaz

S2 završen (5/5); `PublicLayout` i `public-ui.ts` već na novim tokenima; nove primitive dostupne; NEJRA §09 ima retke za ovih 5 ruta.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/pages/public/PublicBlogList.tsx` | **IZMJENA** — `PageHeader`, `FilterBar`, kartice članaka, `EmptyState`/`ErrorState` (retry), paginacija |
| `frontend/src/pages/public/PublicBlogPost.tsx` | **IZMJENA** — članak, share, povratak, komentari |
| `frontend/src/features/blog/*` (list/post/comments dijeljene komponente) | **IZMJENA** — samo prezentački sloj; `public-blog-*-data.mjs` parseri i read-recovery logika **bez izmjene** |
| `frontend/src/pages/public/PublicGallery.tsx` | **IZMJENA** — mreža, kategorije, Radix lightbox, nazivi slika |
| `frontend/src/pages/public/PublicContact.tsx` | **IZMJENA** — kontakt kartice, radno vrijeme, pristup, forma ako postoji |
| `frontend/src/pages/public/PublicSatisfiedClients.tsx` | **IZMJENA** — recenzije, paginacija, `StatusBadge` gdje je primjenjivo |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — novi stringovi (paritet) |
| `frontend/src/components/media-image.tsx` | **SAMO AKO NUŽNO** — aurum-scoped varijanta uz grep-dokaz |

---

## 4. Ugovor

- Rute: `/blog`, `/blog/:slug`, `/galerija`, `/kontakt`, `/zadovoljni-klijenti`; `PublicFeatureGate` flagovi `public_feature_blog`, `public_feature_gallery`, `public_feature_reviews` ostaju.
- Isti endpointi, paginacijski parametri, `approved` projekcija, bounded limit/offset, share logika, komentari submit validacija, stale-response zaštite, `parse*` funkcije — **netaknuto**.
- Zadržati: jedan `<h1>` po stranici, `aria-live` najave, imenovani Radix lightbox (`DialogTitle`), `aria-pressed` na kategorijama, `alt`/`aria-label` iz i18n, jedinstvena imena dugmadi („Podijeli – {naslov}"), nenested anchor CTA-e, `prefers-reduced-motion`, `forced-colors`.
- Nikad boja kao jedini nosilac informacije (status/ocjena/kategorija → tekst + ikona).
- Bez novih zavisnosti, bez promjena `/backend`, `/mobile`.

---

## 5. Koraci

1. Blog lista: nove `PageHeader` + `FilterBar` + `EmptyState`/`ErrorState` primitive; zadržati lokalizovani broj rezultata, `aria-current` na paginaciji, `role="status"` za učitavanje, retry dugme s jedinstvenim imenom.
2. Blog članak: tipografski ritam (Aurum serif za naslove), jedan primarni CTA, share s `aria-label` iz i18n, povratak nenested anchor, komentari s `fieldset/legend`, `aria-describedby`, `aria-invalid`, sažetak grešaka s linkovima na polja, `autocomplete` gdje je primjenjivo, `3.3.7 Redundant Entry` (ne tražiti ponovni unos istih podataka).
3. Galerija: responzivna mreža, aurum okviri/razmaci, zadržati kategorijski naziv na svakom `<button>`, disabled stanje za nestalu sliku, fokus prsten, lightbox s `DialogTitle`/`DialogDescription`, `Esc` i fokus-povratak.
4. Kontakt: tri kartice (kontakt / radno vrijeme / pristup) po §07, semantički `<address>`/`<time>` gdje je smisleno, bez izmišljanja stvarnih podataka — vrijednosti dolaze iz postavki kao i danas.
5. Zadovoljni klijenti: paginacija, ocjena tekstom + zvjezdicama (ne samo bojom), prazno stanje s idućim korakom.
6. Sve nove boje isključivo kroz tokene; aurum varijante kroz `data-[skin=aurum]:` / CSS, ne dirajući klasični prikaz.

---

## 6. Testovi

Zadržati zelenima (ažurirati uz obrazloženje ako markup traži): `test:public-blog-list-i18n`, `test:public-blog-list-recovery`, `test:public-blog-list-accessibility`, `test:public-blog-post-i18n`, `test:public-blog-post-read-recovery`, `test:public-blog-share-accessibility`, `test:public-blog-comments-accessibility`, `test:public-blog-comments-read-recovery`, `test:public-blog-comments-submit`, `test:public-gallery-accessibility`, `test:public-contact-i18n`, `test:public-contact-accessibility`, `test:satisfied-clients-read-recovery`, `test:blog-language-a11y`, `test:generic-aria-and-row-actions`, `test:public-a11y-axe-findings`, `test:theme-ssot-sync`.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + build (budžet) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**, posebno `a11y-e2e` (axe na javnim rutama u default stanju).

---

## 8. DoD + dokazi

- ✅ 5 ruta + blog komponente u 3 stanja; nema tvrdih boja/stringova; paritet.
- ✅ Svi navedeni testovi zeleni; API/parser ugovori netaknuti (diff u STOP-sažetku).
- ✅ Build ≤300 KiB; CI 5/5; evidencija ažurirana (sha + run id).
- 🟡 Rendered reflow/zoom/screen-reader za Aurum → do S11.
- **STOP** → „Odobravaš li S4 (javni tokovi: rezervacija, moje rezervacije, token, unsubscribe, profil)?"

---

## 9. Rizici / pitanja

- Blog članak može sadržavati HTML iz backend sanitizera; ne mijenjati sanitizaciju ni dozvoljene tagove — **ako dizajn traži drugačiji markup sanitiziranog sadržaja → STOP + pitanje** (to bi bio backend/API zahvat).
- Ako se pojavi audio/video u članku (1.2.x), ne izmišljati titlove: bilježi se ➖/🟡 s obrazloženjem i pita vlasnika.
- Kontakt podaci su iz postavki; ne hard-code-ati ilustrativne vrijednosti iz NEJRA §07 (`Ulica Primjer 12`, `+387 33 000 000`) u kod.

---

## 10. Realizacija S3 (2026-11-11) — dokazi i obrazložena odstupanja

**Odobrenje:** `ask_user s3_approval` → **`approve_s3`**: „Pokrenuti S3 — javni sadržaj: blog, galerija, kontakt, zadovoljni klijenti — po istom režimu (plan → implementacija → 5/5 CI → evidencija → STOP). Ne dirati PublicFeatureGate bez nove odluke." Nije traženo novo odobrenje za S2/S3.

**Implementirano (12 fajlova / +386 −90):** 5 stranica (`PublicBlogList`, `PublicBlogPost`, `PublicGallery`, `PublicContact`, `PublicSatisfiedClients`) + `features/blog/{public-blog-comments,public-blog-share}.tsx` + `bs.json`/`en.json` + `styles/globals.css` (164 Aurum-only linije) + 1 source-contract test. Obrazac je svuda `isAurum ? <S1 primitiva / novi Aurum markup> : <doslovno postojeći klasični markup>`, uz `data-aurum-*` markere i `useTheme()`. `EmptyState` (sa sljedećim korakom), `ErrorState` (retry), `PageHeader` (kontakt, jedan `<h1>`), status/alert regije i `DialogDescription` u lightboxu. `fieldset/legend` + `aria-describedby` hint + `aria-busy` na komentarima; `aria-label={t('public.blogShare.shareArticle', { title })}` („Podijeli – {naslov}"); `autoComplete="name"`; `data-aurum-cta="primary"` na jedinom primarnom CTA-u; `Images`/`AlertCircle` ikone uz tekst kategorije i greške; 11 novih BS/EN ključeva u paritetu.

**Lokalno izmjereno:** **204/204** `test:*` PASS / 0 FAIL; 5 Python gate-ova PASS (`check_repo_hygiene` **1789**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n.py --strict` **2728/2728**, `check_ui_contrast.py --strict` **140/140 source-only**); `npm run build` **280,9 / 300 KiB** gzip (**+1,0 KiB** prema S2 279,9); `typecheck:e2e` 0; `lint` 0 grešaka / 7 poznatih warninga; `git diff --check` čist; `postcss.parse` 90 pravila.

**CI dokaz:** commit **`a12cf5b`** (`a12cf5b3a169d8315fb1c1bd23b522178ab1022f`), run **`43116167107`** = `completed/success`, **5/5**: `Backend build and tests`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom`, `Repository hygiene and static reports`, `Mobile TypeScript check`. `a11y-e2e` job **`130844618383`**: **252 passed | 0 failed | 0 skipped**, artifact `playwright-a11y-report` ID **`13899570263`** / 330688 B / SHA256 `d360f1ffc3df2b390b855a2a46eac2d38db941862b4db2c535e9f7626b456627`. Rendered axe pokriva **default `classic`** = dokaz da klasični javni sajt nije regresirao.

**Ugovor netaknut (grep dokaz, 0 diff):** `api.get`/`api.post`, `parsePublicBlogListPage`/`parsePublicBlogPost`/`parsePublicBlogComments`/`parsePublicSatisfiedClientsPage`, `PAGE_SIZE`/`limit`/`offset`, `approved` projekcija, share logika/`AbortError`, komentar validacija, `requestGeneration`/`commentSubmissionGeneration`/`commentsRetryRef`, `post.content.replace(/\n/g, '<br />')` i `dangerouslySetInnerHTML`, `PublicFeatureGate` (`public_feature_blog/gallery/reviews`), `queryKey`, `components/ui/*`, `BeforeAfterSlider.tsx`, `data/*.mjs`, `media-image.tsx`, `features/blog/*-data.mjs`, `package-lock.json`, `/backend`, `/mobile`, `ci.yml`. Kontakt vrijednosti isključivo iz `getSetting(...)`; NEJRA §07 ilustrativni podaci (`Ulica Primjer 12`, `+387 33 000 000`, `info@nejra.example`) nisu u kodu. Nema novih hard-coded hexova ni novih zavisnosti.

**Obrazložena odstupanja od koraka u §5 („ažurirati uz obrazloženje ako markup traži"):**
- **Jedna izmjena source-contracta:** `features/blog/public-blog-share-accessibility.test.mjs` — prvi `assert.match` proširen s `[\\s\\S]*?` između atributa jer `aria-label` iz i18n sada stoji unutar `<Button>`; dodan je i novi `assert.match` za `public.blogShare.shareArticle`. Ostalih 16 navedenih testova nisu dirani i svi su zeleni.
- ➖ **`aria-current` na paginaciji / `aria-pressed` na kategorijama:** S3 rute koriste „Učitaj još" + `IntersectionObserver`, a kategorije galerije su `<h2>` sekcije, ne filter tipke. Ne uvode se lažne kontrole ni lažna paginacija bez promjene API ugovora; `aria-current` ostaje na navigaciji iz S2.
- ➖ **`StatusBadge` / ocjena tekstom + zvjezdicama:** payloadi `parsePublicSatisfiedClientsPage` i galerije ne nose status ni ocjenu. Ne izmišljaju se podaci koji ne postoje u API odgovoru.
- ➖ **`aria-invalid` i sažetak grešaka s linkovima na polja:** komentar forma validira `trim()` + `maxLength`, a neuspjeh se prikazuje toastom (postojeći ugovor). Uvođenje polje-specifične greške bi diralo submit logiku koja je u §4 zabranjena; umjesto toga su dodani `fieldset/legend`, `aria-describedby`, `aria-busy` i `role="status"`.
- ➖ **Audio/video titlovi (1.2.x):** backend `sanitizeBlogContent` uklanja `iframe`/`script`, a dozvoljeni tagovi ne uključuju `<audio>`/`<video>`; S3 nije naišao na takav sadržaj, pa se titlovi ne izmišljaju i **STOP + pitanje nije aktiviran**.
- ➖ **Drugačiji markup sanitiziranog HTML-a:** dizajn S3 stilizuje samo kontejner `.blog-content` (`data-aurum-article`); `dangerouslySetInnerHTML` i backend sanitizacija ostaju netaknuti, pa **STOP + pitanje nije aktiviran**.

**Šta još NIJE dokazano (🟡 do S11):** rendered axe nad `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA. `140/140` i `test:public-aurum-hero-contrast` su **source-only**. CI log i dalje ima nepotpune `1.4.3` (8) / `2.5.3` (22) i poznate `1.4.6` AAA padove (28 violations / 70 čvorova); **ne tvrdi se WCAG 2.2/AAA usklađenost**.

**Sljedeći korak:** **STOP** → „Odobravaš li S4 (javni tokovi: rezervacija, moje rezervacije, token, unsubscribe, profil)?".
