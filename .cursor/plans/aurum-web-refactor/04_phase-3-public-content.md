# S3 — Javni sadržaj: Blog, Galerija, Kontakt, Zadovoljni klijenti

**Status:** 🟡 **u toku** (odobrenje `approve_s3`; režim: plan → implementacija → 5/5 CI → evidencija → STOP) · **Obuhvata 5 javnih ruta + dijeljene blog komponente.**

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
