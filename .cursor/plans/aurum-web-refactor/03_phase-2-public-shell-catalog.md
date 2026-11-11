# S2 — Javni shell + Početna + Usluge + Detalj usluge

**Status:** ✅ **S2 ZAVRŠEN (5/5 CI `43110763869` na `d1fb55d` / `d1fb55d7006e8e74c24f6f0ee018424136c92ba7`)** · **Prvi segment koji konzumira nove tokene i primitive.** Odobrenje: „Možeš krenuti sa S2"; STOP uvjet iz §9 riješen odlukom `dopuna_ssot`: NEJRA §10 dopunjen izračunatim hero kontrastom bez izmjene palete. Sljedeći korak: **STOP** → pitanje za S3.

---

## 1. Cilj

Refaktor javnog omotača i kataloškog dijela prema NEJRA §07 (javno iskustvo), §09 (mapa ekrana), §11 (šabloni) i §10 (3 stanja): filmski hero, jedan poziv na akciju po ekranu, serifni naslovi u Aurumu, katalog s filterima, galerijske kartice, prazna/učitavanje/greška stanja, reflow na 320 px, bez promjene podataka.

---

## 2. Ulaz

S1 završen (5/5, run `43100889990`, commit `ae87acf`); `ThemeSwitcher` već u `public-layout.tsx`; nove primitive u `features/shell/aurum/ui/`; NEJRA §09 ima retke za 4 ekrana ovog segmenta. Potvrđena pretpostavka R2.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/features/shell/public/public-layout.tsx` | **IZMJENA** — header/nav/footer po §07; zadržati `SkipLink`, `DialogTitle` u draweru, `aria-expanded`/`aria-controls`, `LanguageSwitcher`, `ThemeSwitcher` iz S1, feature flagove |
| `frontend/src/features/shell/public/public-ui.ts` | **IZMJENA** — `publicHeader` / `publicPage` / `publicSection` na semantičke tokene (bez tvrdih boja) |
| `frontend/src/features/shell/public/before-after-spotlight.tsx` | **IZMJENA** — Aurum varijanta; zadržati 2.5.7 tastaturnu alternativu za slider |
| `frontend/src/pages/public/PublicHome.tsx` | **IZMJENA** — hero, before/after, istaknuta recenzija, CTA; `MotionConfig` / `fadeUp` / `staggerContainer` ostaju pod `reducedMotion="user"` |
| `frontend/src/pages/public/PublicServices.tsx` | **IZMJENA** — editorski katalog, search/category filteri, kartice |
| `frontend/src/pages/public/PublicServiceDetail.tsx` | **IZMJENA** — identitet usluge, galerija, CTA, not-found stanje |
| `frontend/src/components/BeforeAfterSlider.tsx`, `components/media-image.tsx` | **IZMJENA samo ako je nužno** — aurum-scoped CSS varijanta, ne mijenjati klasično ponašanje; dokaz grep-om + `test:before-after-i18n` |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — novi stringovi (paritet) |
| `frontend/src/features/public-catalog/*` (data/*.mjs) | **BEZ IZMJENE** — parseri i ugovori podataka ostaju netaknuti |

---

## 4. Ugovor

- Iste rute: `/`, `/usluge`, `/usluge/:serviceId`; isti API pozivi (`/api/daily-log/before-after`, public services, featured review, satisfied clients), isti `limit`/`random` parametri, iste stale-response generacije (`useRef` brojači) i isti retry tokovi.
- Ista lokalizacija i formati; svaki novi vidljivi string u oba jezika; `aria-label`/`alt`/`placeholder` također kroz i18n.
- Hero u Aurumu ostaje „uvijek filmski tamno" po §07 — to je **namjerna iznimka** od svijetle teme i mora imati izračunat kontrast teksta `#F5EDE0` na tamnoj pozadini u NEJRA §10.
- `PublicFeatureGate` (`public_feature_blog/gallery/reviews`) se ne dira; `AppLogo`/`UploadedBrandLogo` i runtime logo boje ostaju (u klasičnom stanju).
- Nema novih ekrana, novih akcija, novih zavisnosti. `check-bundle-budget.mjs` ≤300 KiB.

---

## 5. Koraci

1. `public-ui.ts` + `public-layout.tsx`: zamijeniti sirove `slate-*`/tvrde boje semantičkim tokenima; zadržati sticky header, `scroll-padding-top` (2.4.11), drawer s naslovom, aktivnu stavku `aria-current` + oblik (ne samo boja), 44 px mete, logo reflow na 320 px (postojeći komentar u `globals.css` o 53 px skrola se ne smije ponovo pojaviti).
2. `PublicHome`: hero po §07 (`radial-gradient`, zlatni CTA, `prefers-reduced-motion` za `drift` animaciju), jedan primarni CTA, before/after spotlight s tastaturnom alternativom, stanja loading/empty/error za oba async bloka, bez layout shift-a (rezervirana visina), `<h1>` jedan po stranici, semantički `<section>` + headings bez preskakanja.
3. `PublicServices`: preći na nove `FilterBar`/`EmptyState`/`ErrorState` primitive; zadržati `aria-pressed` na filterima, lokalizovani broj rezultata, search, kategorije, responzivne kartice; sort/filter logika netaknuta.
4. `PublicServiceDetail`: novi `PageHeader` + `StatusBadge` gdje treba; zadržati payload validaciju, `aria-live` najave učitavanja, stale-request zaštitu, 404 `<h1>`, nenested anchor CTA-e.
5. Aurum varijante: `data-[skin=aurum]:font-serif` za naslove, zlatni akcent štedljivo (samo akcija/brend), radijus 12–16 px, tanke 1–1,5 px linije; sve kroz tokene.
6. Ažurirati pogođene source-contract testove **uz obrazloženje** u `CHANGELOG.md` (zadržati istu garanciju, npr. ako se promijeni klasa heroja, test i dalje traži jedan `<h1>` i kontrast).

---

## 6. Testovi

Zadržati zelenima (i po potrebi ažurirati uz obrazloženje): `test:public-home-accessibility`, `test:public-home-before-after-recovery`, `test:public-home-featured-review-recovery`, `test:before-after-i18n`, `test:public-services-redesign`, `test:public-services-recovery`, `test:public-catalog-i18n`, `test:public-service-detail-recovery`, `test:public-a11y-axe-findings`, `test:label-in-name`, `test:shell-a11y`, `test:navigation-drawer-accessibility`, `test:form-control-labels`, `test:theme-ssot-sync`.

Novi (ako mark-up to traži): `test:public-aurum-hero-contrast` — čita NEJRA §10 i `globals.css`, potvrđuje da hero parovi prolaze u oba Aurum stanja. Svaki novi `test:*` + CI korak.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + `npm run build` (izmjeriti `public home` gzip delta u `check-bundle-budget.mjs`) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**. `a11y-e2e` axe na 32 rute (default classic) ostaje zelen = dokaz da klasični javni sajt nije regresirao.

---

## 8. DoD + dokazi (izmjereno 2026-11-11)

- ✅ **4 ekrana + shell u 3 stanja.** `classic` je DOSLOVNO netaknut (svi novi CSS pravila su pod `[data-skin="aurum"]`, primitive se renderuju samo za `skin === 'aurum'`); `aurum-light` / `aurum-dark` dobijaju serifne naslove, semantičke tokene, 44 px mete, `aria-current` + oblik, filmski hero. Nema **novih** tvrdih boja: legacy hex klase u TSX-u ostaju radi klasičnog pariteta, a pod Aurumom ih prekrivaju `hsl(var(--*))` tokeni. BS/EN paritet: **nijedan novi vidljivi string** — korišteni su već postojeći ključevi (`check_i18n.py --strict` 2717/2717).
- ✅ **Svi navedeni testovi zeleni; nijedan nije oslabljen.** Puna petlja **204/204 PASS / 0 FAIL** (203 S1 + novi `test:public-aurum-hero-contrast` 4/4). Novi test čita NEJRA §10 `const T` + §07 `.hero` alfe + `globals.css`, računa najsvjetliju kompoziciju i odbija mutacije; dobio je svoj CI korak (`ci.yml` #617–#619). Nijedan postojeći source-contract test nije mijenjan; jedina izmjena S1 primitiva je **opcioni** `showSubmit = true` na `FilterBar` (default = identično S1 ponašanje), obrazloženo u `CHANGELOG.md`.
- ✅ **API/parametri/stale-request/flagovi netaknuti.** `git diff` nad `frontend/src` ne sadrži `PublicFeatureGate`, `AppLogo`, `UploadedBrandLogo`, `public_feature_*`, `queryKey`, `/api/`, `limit`, `random`, `*RequestIdRef` ni `requestIdRef`. `components/ui/*`, `BeforeAfterSlider.tsx`, `media-image.tsx`, `features/public-catalog/*` (osim novog testa) i `data/*.mjs` imaju **0 diff**. `package-lock.json` 0 diff; nema novih zavisnosti, ekrana ni akcija.
- ✅ **Build ≤300 KiB:** `279,9 / 300 KiB` gzip (+0,8 prema S1 279,1); `public home 45,4`, `dashboard 13,5`, `stylist inbox 17,9`, `analytics 114,7/140`, `calendar 99,4/125`. 5 Python gate-ova PASS (`check_repo_hygiene` **1789 nakon S2 commit-a**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n` **2717/2717**, `check_ui_contrast` **140/140 source-only**); `typecheck:e2e` 0; `npm run lint` 0 grešaka / 7 poznatih warninga; `git diff --check` čist.
- ✅ **`a11y-e2e` zelen:** run **`43110763869`** = **5/5 success**, `headSha=d1fb55d7006e8e74c24f6f0ee018424136c92ba7`; job `130825854913` daje **252 passed | 0 failed | 0 skipped** nad **32 rute** na default `classic`, artifact `playwright-a11y-report.zip` ID **`13896851237`** / 331270 B / SHA256 `b27443d74d6a31b714ebf8d8a7f66958594f9147ee7bb506602d53907a7e56f4`. CI log i dalje ima nepotpune `1.4.3` (8) / `2.5.3` (22) i poznate `1.4.6` AAA padove (28 violations / 70 čvorova) — **ne tvrdi se WCAG 2.2/AAA usklađenost**.
- 🟡 Rendered izgled Auruma na 320 px / zoom 400%, čitač ekrana i rendered axe za `aurum-light`/`aurum-dark` nisu provjereni — `e2e/dom-metrics` i `a11y-e2e` daju samo ono što mjere; ostaje 🟡 do S11.
- **STOP** → „Odobravaš li S3 (javni sadržaj: blog, galerija, kontakt, zadovoljni klijenti)?"

---

## 9. Rizici / pitanja

- `components/ui/*` dijele javni sajt i admin: svaka izmjena mora imati grep-dokaz da klasični prikaz nije promijenjen; u suprotnom aurum-scoped varijanta.
- ✅ **RIJEŠENO (`dopuna_ssot`, 2026-11-11):** hero kontrast u NEJRA §10 nije bio izračunat za `#F5EDE0` na gradientu → poslan STOP + pitanje; vlasnik je odabrao dopunu SSOT-a. §10 sada ima 4 izračunata omjera iz §07, a `test:public-aurum-hero-contrast` + CI korak ih ponavljaju iz `const T`; paleta nije korigovana.
- Ako `PublicServices` filter logika traži promjenu `queryKey`/API poziva da bi se uklopila u novi `FilterBar` → **STOP** (Q10).
