# CHANGELOG — Aurum web refaktor

Format svakog unosa: `datum · segment · šta · zašto · fajlovi · testovi · CI run id · status dokaza`.
**Pravilo:** svaka izmjena postojećeg testa mora ovdje imati obrazloženje da je **zadržana ista garancija** (Q10). Svaka promjena boje/tokena mora imati `staro → novo` i omjer kontrasta.

---

## 2026-11-11 · K0 · Plan kreiran (bez koda)

**Šta:** kreiran `.cursor/plans/aurum-web-refactor/` sa `00_overview.md`, 12 faznih planova (`01`–`12`), `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`; kreirane plan-matrice `.cursor/docs/matrices/aurum-theme/` i `.cursor/docs/matrices/aurum-route-coverage/` (obe s `MATRIX.md` + `CHANGELOG.md`).

**Zašto:** zahtjev vlasnika (unaprijediti referentni dizajn → refaktor javnih stranica i svih dashboarda, segmentno, planski, uz sve CI provjere, bez izmišljanja) + odluke Q1–Q11 prikupljene kroz dva kruga pitanja.

**Fajlovi:** isključivo `.cursor/plans/**` i `.cursor/docs/matrices/**`. **Nijedan** fajl u `frontend/`, `backend/`, `mobile/`, `.github/`, `scripts/`, `docs/`, `SOURCE_OF_TRUTH.md` nije diran. Nije napravljen commit ni push.

**Istraživanje (izmjerene činjenice, ne pretpostavke):**
- `docs/design/` ima 1 fajl (`NEJRA – beauty salon · Referentni dokument.html`, 26.070 B); `referentni-prijedlog-v2.html` i `-v3.html` ne postoje na ovoj grani.
- Baseline: 5 Python provjera PASS; `npm run build` PASS (276,9/300 KiB); `test:*` **197 PASS / 1 FAIL** (`test:design-reference`, ENOENT); `check_i18n.py` 2711/2711; `check_ui_contrast.py` 80/80; `check_doc_links.py` 670/202.
- `.dark` klasa se nigdje u `frontend/src` ne dodjeljuje; runtime brand override ide kroz `SettingsContext.tsx` → `buildBrandColorVariables` → inline `--brand-*` na `<html>`.
- CI: 5 poslova; `a11y-e2e` jedini daje rendered axe dokaz (Chromium u sandboxu nedostupan, `run-a11y-routes.mjs` namjerno `SKIPPED`).

**Testovi:** nisu pokrenuti nad izmjenama (nema koda); ponovo pokrenute su samo read-only Python provjere radi potvrde da plan-dokumenti ne kvare `check_doc_links.py` / `check_repo_hygiene.py`.

**CI run id:** nema (namjerno nije bilo pusha; workflow se pokreće samo na `push` u `arena/**`, a baseline bi bio crven).

**Status dokaza:** ✅ za činjenice izmjerene u repozitoriju; 🟡 za sve buduće implementacijske tvrdnje; ⬜ za 12 segmenata.

---

## 2026-11-11 · S0 · Dizajn dokumenti + popravka CI baselinea

**Šta:**
- `docs/design/NEJRA – beauty salon · Referentni dokument.html` dograđen s 8 na **14 sekcija**: §09 mapa **58 deklaracija ruta** (generisana iz `router.tsx` / `public.routes.tsx` / `admin.routes.tsx`, 14 javnih + 8 izuzetaka + 24 admin + 12 stylist), §10 tokeni za **3 stanja** (`#theme-states`) + uživo izračunata tablica kontrasta `#tok3` (2 Aurum stanja × 11 parova, **22/22 „Prolazi"**, light 3,73–17,55:1 / dark 4,01–16,89:1), §11 katalog 11 šablona, §12 ugovor izbornika teme (3 opcije, `localStorage`, `data-skin`, `theme-color`, Q9 precedencija), §13 paritet + CI matrica svih 5 poslova, §14 kontrolna lista 12 segmenata. Naslov sada sadrži „Aurum" i „puna specifikacija"; nav proširen na 01–14; izvornih 8 interaktivnih demo-a (tema, komponente, admin filteri, booking, odobravanje) **ostaju netaknuti**.
- **NOVO** `docs/design/referentni-prijedlog-v2.html` („Atelier Ivory", 446 KiB) i `-v3.html` („Noir Cinéma", 329 KiB): dva različita vizuelna koncepta, svaki sa 7 obaveznih sekcija, 22 `.demo` ekrana, 2 ugrađene **AI ilustracije** (`data:image/jpeg;base64,`), ispravnim `light/dark` prekidačem i eksplicitnom napomenom da su koncepti, ne specifikacija.
- **NOVO** `frontend/scripts/design-spec.test.mjs` (2 testa + 7 mutacijskih provjera), skripta `test:design-spec` u `frontend/package.json`, novi korak `Test NEJRA full design specification` u `ci.yml` (`frontend` posao).
- 4 AI ilustracije generisane alatom; privremeni JPEG-ovi **nisu u Gitu** (ugrađeni su kao base64 i obrisani s diska).

**Zašto:** Q1/Q7 (NEJRA = jedini izvor istine, puna specifikacija), Q5/Q11 (kreirati v2/v3 s novim AI ilustracijama), Q6 (prvi segment), te popravka izmjerenog baseline kvara `test:design-reference` (`ENOENT`).

**Fajlovi:** 3 × `docs/design/*`, `frontend/scripts/design-spec.test.mjs`, `frontend/package.json`, `.github/workflows/ci.yml`, plan-dokumenti i matrice. **Nijedan** fajl u `frontend/src`, `backend/`, `mobile/`, `.env` ili migracijama nije diran.

**Testovi:** `test:design-reference` **6/6** (prije: FAIL), `test:design-spec` **2/2** (uključuje 7 mutacija), puna `test:*` petlja **199/199** (prije 197/198), `check_ci_index.py` 380/383, `check_doc_links.py` 685/222, i18n 2711/2711, kontrast 80/80, `npm run build` 276,9/300 KiB, `typecheck:e2e` 0, `git diff --check` čist.

**CI međufaza (historijski, još ne 5/5):** commit `fa6d73a` pushan na granu. Run `43032814134` (push) i run `43038425689` (`workflow_dispatch`, isti commit) imaju **4/5 success**: `repo-checks`, `backend`, `frontend`, `mobile` ✅; `a11y-e2e` ❌ na koraku 15 `Install Chromium for Playwright`. Tri reruna neuspješnog posla i jedan potpuno novi run padaju na istom `Temporary failure resolving 'azure.archive.ubuntu.com'` u `apt-get` dijelu `npx playwright install --with-deps chromium` (fali 9 font paketa). Korak `Run rendered a11y (axe) suite` je tada bio `skipped`. Ovo nije regresija aplikacije — S0 ne dira `frontend/src`; rješenje je zatraženo i odobreno odlukom `ci_fallback` (vidi nastavak).

**Status dokaza u međufazi:** ✅ lokalno izmjereno; 🔴 prva dva CI runa 4/5 zbog vanjske infrastrukture; 🟡 rendered a11y u sandboxu (`SKIPPED`).

**Odluke vlasnika nakon blokade (2026-11-11):** `ci_fallback` — odobren minimalni CI-only fallback (bez `--with-deps` ako `apt` padne, uz fail-closed provjeru browser fajla i odbijanje `SKIPPED` axe izlaza); `dark_yes` — **R2 je riješeno**, `Aurum tamna` smije dodijeliti `.dark` klasu. Nijedna odluka ne odobrava automatski S1.

**Konačni CI dokaz:** commit `bbd7ca5` → run **`43043182552`** = ✅ **5/5 success** (`repo-checks`, `backend`, `frontend`, `a11y-e2e`, `mobile`). U `a11y-e2e` su koraci 15 i 16 zeleni; job log: **252 passed | 0 failed | 0 skipped** nad 32 rute, bez aktiviranja `SKIPPED` zaštite. `1.4.6 color-contrast-enhanced` (AAA) ima 28 prekršaja u coverage anotaciji, ali nije asertirani prag; ne tvrdi se potpuna WCAG 2.2/AAA usklađenost ni ručni čitač/zoom/uređaj dokaz.

**Konačni status (S0):** ✅ S0 završen po pravilu „5/5 + STOP"; vlasnik je 2026-11-11 **naknadno eksplicitno odobrio S1, S2, S3 (`approve_s3`), S4 (`approve_s4`) i S5 (`approve_s5` + `card_header`)**, pa S1–S5 više ne čekaju odobrenje (**S6–S11 i dalje čekaju**). S0 je zaključio docs-only commit `3ed3069` s runom `43046250037` = **5/5**.

**Izmjene postojećih testova:** nema — `design-reference.test.mjs` ostaje netaknut; samo su kreirani fajlovi koje je očekivao.

---

## 2026-11-11 · S1 · Temelj: tokeni + 3-state tema + primitive

**Šta:** implementiran jedini novi feature projekta (Q8) po `02_phase-1-foundation.md`:
- **NOVO** `frontend/src/features/shell/theme/`: `theme-state.mjs` (čista state mašina: 3 stanja, `normalizeTheme`, `readStoredTheme`/`writeStoredTheme` nad ključem `nejra.theme`, `applyTheme`), `theme-state.d.mts`, `theme-context.tsx` (`ThemeProvider` + `useTheme()` → `{ choice, setChoice, skin, mode }`), `theme-switcher.tsx` (`role="group"`, 3× `button[aria-pressed]`, `role="status"` najava, 44 px mete, isključivo i18n natpisi).
- **NOVO** 4 source-contract testa: `theme-state.test.mjs` (5/5), `theme-switcher-a11y.test.mjs` (6/6), `theme-brand-precedence.test.mjs` (5/5), `theme-ssot-sync.test.mjs` (8/8); svaki ima mutacijske provjere.
- **NOVO** `frontend/src/features/shell/aurum/ui/` — 8 primitiva po NEJRA §11: `page-header`, `stat-card`, `filter-bar`, `data-table`, `status-badge`, `data-state`, `confirm-dialog`, `form-section`. Stari `features/shell/admin/ui/*` ostaju do S11.
- **IZMJENA** `globals.css`: 2 Aurum bloka (`[data-skin="aurum"][data-mode="light"]`, `.dark[data-skin="aurum"]`, specifičnost 0,2,0) s 12 **tačnih** hexova iz NEJRA §10 + izvedenim semantičkim HSL/raw tokenima + `color-scheme`; `:root` i `.dark` netaknuti. `tailwind.config.js`: `fontFamily.serif` (sistemski Palatino/Georgia stack, bez vanjskih fontova).
- **IZMJENA** `providers.tsx` (`ThemeProvider` iznad `SettingsProvider`), `SettingsContext.tsx` (Q9 guard: pod Aurumom se `buildBrandColorVariables` ne poziva i inline `--brand-*` se uklanjaju; sama funkcija netaknuta), 3 layouta (`ThemeSwitcher`), `SettingsAppearance.tsx` (lokalizovana Q9 napomena), `bs.json`/`en.json` (6 novih ključeva).
- **IZMJENA** `scripts/check_ui_contrast.py` (4 stanja, 140 parova), `frontend/package.json` (4 nove `test:*` skripte → 203), `.github/workflows/ci.yml` (4 nova koraka u `frontend` poslu).

**Zašto:** odobrenje vlasnika za S1; NEJRA §10/§12 je jedini izvor istine; Q9 (Aurum fiksira paletu); R2 riješen odlukom `dark_yes`; strogi paritet (Q10).

**Odluka o 140 parova (`use_140_four`, 2026-11-11):** plan je tvrdio „30 postojećih × 2 = +60", a stvarni parser je imao **26** web parova po stanju (80 ukupno: 52 web + 28 mobile). Na eksplicitno pitanje vlasnik je odabrao zadržati **140** uz 4 nova para po Aurum stanju iz NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) → 30 × 2 = 60. **Nijedna boja nije izmišljena ni korigovana**; `test:theme-ssot-sync` poredi svih 12 hexova s HTML-om. Izmjereni rasponi: Aurum light 3,73–17,55:1, Aurum dark 3,70–16,89:1.

**Fajlovi:** isključivo `frontend/src/features/shell/{theme,aurum}/`, 11 navedenih izmjena u `frontend/` + `scripts/check_ui_contrast.py` + `.github/workflows/ci.yml` + ovi plan-dokumenti/matrice. **Nema** izmjena ruta, API-ja, `queryKey`, socket eventa, guardova, iznosa, datuma, statusa, filtera, sorta, paginacije, zbirova, `buildBrandColorVariables`, `test:brand-colors`, `/mobile`, `/backend`, `.env`, migracija, `package-lock.json` ni novih npm zavisnosti.

**Testovi:** puna `test:*` petlja **203/203 PASS / 0 FAIL**; nova 4 testa 5/5 + 6/6 + 5/5 + 8/8; 5 Python gate-ova PASS (`check_repo_hygiene` **1788 nakon S1 commit-a** (prije 1772), `check_ci_index` **384/387** s 203 frontend skripte, `check_doc_links` **687/222**, `check_i18n.py --strict` **2717/2717**, `check_ui_contrast.py --strict` **140/140**); `npm run lint` 0 grešaka (7 prethodnih warninga); `npm run build` **279,1 / 300 KiB** gzip (analytics 114,7/140, calendar 100,0/125), **delta +2,2 KiB** prema S0 276,9 KiB; `typecheck:e2e` 0; `git diff --check` čist. `js-yaml` parsirao `ci.yml`: 419 `run` koraka (prije 415).

**Commit:** `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), 40 fajlova / +1872 −61.

**CI run id:** **`43100889990`** — `gh run watch` + `gh run view` = **5/5 success** (`headSha` = gornji SHA): `Mobile TypeScript check`, `Repository hygiene and static reports`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom`, `Backend build and tests`. Sva 4 nova S1 koraka u `frontend` jobu `130791757438` (#155–#158) su `success`. `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute, artifact `playwright-a11y-report.zip` ID `13891846859` / 331192 B / SHA256 `2e820a06fb5220e743707ed8c82a8a12da8978a02f7b976f5f428f49afe4fe93`. Rendered axe i dalje pokriva **default `classic`** — to je dokaz da klasični izgled nije regresirao, ne i Aurum stanja; axe za `aurum-light`/`aurum-dark`, zoom/reflow i čitač ekrana ostaju 🟡 do S11. `140/140` je source-only; CI log zadržava nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove.

**Dokazi:** ✅ lokalni (gore); 🟡 rendered Aurum stanja i sve ručne provjere do S11; ➖ `/mobile` i fizički uređaj (Q3).

**Izmjene postojećih testova:** **nema** — svih 199 S0 testova ostaje netaknuto i zeleno; dodana su samo 4 nova.

**Otvoreno:** nema za S1; S2 je naknadno eksplicitno odobren i završen (vidi unos ispod).

---

## 2026-11-11 · S2 · Javni shell + Početna + Usluge + Detalj usluge

**Šta:** prvi potrošač S1 temelja po `03_phase-2-public-shell-catalog.md`:
- **SSOT dopuna (odluka `dopuna_ssot`):** u NEJRA §10, odmah iza `#tok3`, upisan izračunat kontrast filmskog heroja iz §07 — kompozicija `rgb(120.21, 84.54, 60.83)`, `#F5EDE0`/kompozicija **5.73:1**, `#D4AF6A`/kompozicija **3.22:1**, `#1A1204`/`#D4AF6A` **8.96:1**, `#F5EDE0`/`#0E0B08` **16.89:1**. Boje uzete isključivo iz `const T`; **nijedna paleta nije korigovana**. Time je razriješen STOP uvjet iz plana §9 (prije dopune nije bilo izračunatog para).
- **NOVO** `test:public-aurum-hero-contrast` (4/4) + `frontend/package.json` skripta + `ci.yml` korak. Test čita `const T`, `.hero`/`.hero:after` alfe i `globals.css`, komponuje najsvjetliju pozadinu, mjeri 4 para za oba Aurum stanja, traži tamni veo, `prefers-reduced-motion` i odbija mutacije `T.dark.text`. `check_ci_index.py` potvrđuje obosmjerni paritet (385/388).
- **Aurum-only CSS** u `globals.css` (155 linija, sve pod `[data-skin="aurum"]`): hero `radial-gradient` + `--nejra-hero-*` tokeni, zlatni CTA, prigušena fotografija + tamni veo, `aurum-hero-drift 14s linear 2 both` (ne `infinite`) s eksplicitnim `prefers-reduced-motion`, serifni naslovi, semantički tokeni za header/footer/katalog, 44 px mete, `aria-current="page"` + zlatna crtica (oblik, ne samo boja), rezervisana visina async blokova, 12–16 px radijus i 1–1,5 px linije. `:root` i `.dark` klasični blokovi **netaknuti**.
- **IZMJENA** `public-layout.tsx` (`data-aurum-shell`, `aria-current` u desktop + drawer nav), `public-ui.ts` (`publicAurum` semantička mapa), `PublicHome.tsx` (`data-aurum-hero/-image/-overlay`, `data-aurum-cta`), `PublicServices.tsx`, `PublicServiceDetail.tsx`, `before-after-spotlight.tsx` (scope atributi + semantički `publicAurum` klase samo pod Aurumom).
- **S1 primitive konzumirane:** `FilterBar` (+ opcioni `showSubmit = true`, javni katalog koristi `showSubmit={false}` jer filtrira uživo), `TableSkeleton`, `EmptyState`, `ErrorState` u `PublicServices`; `PageHeader` + `StatusBadge` u `PublicServiceDetail`. Sve se renderuje **samo** za `skin === 'aurum'`; klasična grana u izvoru ostaje doslovno identična, pa nema duplih `id`-jeva ni promjene klasičnog DOM-a.

**Zašto:** vlasnik je odobrio S2 („Možeš krenuti sa S2"), a na STOP uvjet je odabrao `dopuna_ssot`. NEJRA §07/§09/§10/§11 su jedini izvor; Q10 traži strogi paritet; `components/ui/*` dijele javni sajt i admin, pa nisu dirani (grep dokaz: 0 diff). `FilterBar` nije tražio promjenu `queryKey`/API-ja (Q10 STOP nije aktiviran).

**Izmjene postojećih testova:** **NEMA**. Svih 203 S1 `test:*` skripti ostaje netaknuto i zeleno; dodan je samo 1 novi test (204 ukupno). Jedina izmjena S1 koda u primitivu je **opcioni** `showSubmit` s defaultom `true` — time je zadržana ista garancija za sve buduće potrošače (`common.filter` i dalje postoji u izvoru), a javni katalog ne dobija no-op submit dugme. Nijedan source-contract test nije oslabljen; `CHANGELOG.md` je ovo obrazloženje koje traži plan §5 korak 6.

**BS/EN:** nema novih vidljivih stringova, `aria-label`, `alt` ni `placeholder`; korišteni su već postojeći `table.*`, `common.filter`, `finance.states.*` i `public.*` ključevi. `bs.json`/`en.json` imaju **0 diff**; `check_i18n.py --strict` 2717/2717.

**Fajlovi:** `docs/design/NEJRA …html`, `.github/workflows/ci.yml`, `frontend/package.json`, 9 fajlova u `frontend/src/` (uključujući `aurum/ui/filter-bar.tsx`), novi `frontend/src/features/public-catalog/public-aurum-hero-contrast.test.mjs`, `03_phase-2-public-shell-catalog.md`. **0 diff:** `frontend/src/components/ui/*`, `BeforeAfterSlider.tsx`, `media-image.tsx`, `features/public-catalog/*` (osim novog testa), `data/*.mjs`, `PublicFeatureGate`, `AppLogo`/`UploadedBrandLogo`, `queryKey`, API pozivi/`limit`/`random`, `useRef` stale brojači, retry tokovi, `package-lock.json`, `/mobile`, `/backend`.

**Testovi:** puna `test:*` petlja **204/204 PASS / 0 FAIL**; novi test **4/4**; 5 Python gate-ova PASS (`check_repo_hygiene` **1789 nakon S2 commit-a**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n.py --strict` **2717/2717**, `check_ui_contrast.py --strict` **140/140 source-only**); `npm run build` **279,9 / 300 KiB** gzip (**+0,8 KiB** prema S1 279,1; `public home` 45,4, `dashboard` 13,5, `stylist inbox` 17,9, `analytics` 114,7/140, `calendar` 99,4/125); `typecheck:e2e` 0; `npm run lint` 0 grešaka / 7 poznatih warninga; `git diff --check` čist.

**Commit:** `d1fb55d` (`d1fb55d7006e8e74c24f6f0ee018424136c92ba7`), 13 fajlova / +547 −129.

**CI run id:** **`43110763869`** — `gh run watch --exit-status` + `gh run view` = **5/5 success**, `headSha=d1fb55d7006e8e74c24f6f0ee018424136c92ba7`: `Mobile TypeScript check`, `Repository hygiene and static reports`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom`, `Backend build and tests`. Novi korak `Test NEJRA Aurum hero contrast (S2)` je `success`. `a11y-e2e` job `130825854913`: **252 passed | 0 failed | 0 skipped** nad **32 rute**, artifact `playwright-a11y-report.zip` ID **`13896851237`** / 331270 B / SHA256 `b27443d74d6a31b714ebf8d8a7f66958594f9147ee7bb506602d53907a7e56f4`. Rendered axe i dalje pokriva **default `classic`** = dokaz da klasični javni sajt nije regresirao. CI log zadržava nepotpune `1.4.3` (8) / `2.5.3` (22) i poznate `1.4.6` AAA padove (28 violations / 70 čvorova); **ne tvrdi se WCAG 2.2/AAA usklađenost**.

**Dokazi:** ✅ lokalni + CI 5/5; 🟡 rendered axe za `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana i `1.4.6` AAA do S11; ➖ `/mobile` i fizički uređaj (Q3).

**Otvoreno:** nema za S2; **S3 je odobren (`approve_s3`) i završen — vidi unos ispod**. **S4 traži STOP + eksplicitno odobrenje**.

---

## 2026-11-11 · S3 · Javni sadržaj (blog, galerija, kontakt, zadovoljni klijenti)

**Šta:** 5 javnih ruta + `features/blog/{public-blog-comments,public-blog-share}.tsx` dobile su Aurum granu (`isAurum` iz `useTheme()`), `data-aurum-*` markere i 164 Aurum-only CSS linije u `globals.css`. `EmptyState`/`ErrorState` (retry + sljedeći korak), `PageHeader` (kontakt), `DialogDescription` u Radix lightboxu, `fieldset/legend` + `aria-describedby` na komentarima, `aria-label` „Podijeli – {naslov}" iz i18n, `Images`/`AlertCircle` uz tekst, 11 novih BS/EN ključeva. Klasične grane u izvoru ostaju doslovno identične. Jedini izmijenjeni test je `public-blog-share-accessibility.test.mjs` (regex proširen zbog novog `aria-label`, uz dodan assert); ostalih 16 S3 testova su nepromijenjeni i zeleni.

**Zašto:** odluka **`approve_s3`** — „po istom režimu (plan → implementacija → 5/5 CI → evidencija → STOP). Ne dirati PublicFeatureGate bez nove odluke." NEJRA §07/§09/§11 su jedini izvor; Q10 traži strogi paritet. `components/ui/*`, `BeforeAfterSlider.tsx`, `data/*.mjs`, `media-image.tsx`, `features/blog/*-data.mjs`, `PublicFeatureGate`, `queryKey`, backend sanitizacija, `/backend`, `/mobile` i `package-lock.json` imaju **0 diff** (grep dokaz u §10 S3 plana). Kontakt vrijednosti isključivo iz `getSetting(...)`; NEJRA ilustrativni podaci nisu u kodu.

**Izmjene testova:** 1 (gore navedena) — bez novih `test:*` skripti, bez novih CI koraka, `check_ci_index.py` ostaje **385/388**.

**Testovi:** puna `test:*` petlja **204/204 PASS / 0 FAIL**; 5 Python gate-ova PASS (`check_repo_hygiene` **1789**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n.py --strict` **2728/2728**, `check_ui_contrast.py --strict` **140/140 source-only**); `npm run build` **280,9 / 300 KiB** gzip (**+1,0 KiB** prema S2 279,9; `public home` 45,4, `dashboard` 13,5, `stylist inbox` 17,9, `analytics` 114,7/140, `calendar` 100,1/125); `typecheck:e2e` 0; `lint` 0 grešaka / 7 poznatih warninga; `postcss.parse` 90 pravila; `git diff --check` čist.

**CI run id:** **`43116167107`** — `gh run watch --exit-status` (`watch_exit=0`) + `gh run view` = **completed/success, 5/5**, `headSha=a12cf5b3a169d8315fb1c1bd23b522178ab1022f`: `Backend build and tests`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom`, `Repository hygiene and static reports`, `Mobile TypeScript check`. `a11y-e2e` job **`130844618383`**: **252 passed | 0 failed | 0 skipped**, artifact `playwright-a11y-report.zip` ID **`13899570263`** / 330688 B / SHA256 `d360f1ffc3df2b390b855a2a46eac2d38db941862b4db2c535e9f7626b456627`. Rendered axe i dalje pokriva **default `classic`**. CI log zadržava nepotpune `1.4.3` (8) / `2.5.3` (22) i poznate `1.4.6` AAA padove (28 violations / 70 čvorova); **ne tvrdi se WCAG 2.2/AAA usklađenost**. `140/140` i hero kontrast su source-only; rendered axe za 3 stanja, 320 px / zoom 400%, čitač ekrana i AAA ostaju 🟡 do S11.

**Otvoreno:** nema za S3; **S4 traži STOP + eksplicitno odobrenje**.

---

## Budući unosi (popunjavaju se stvarnim podacima, ne unaprijed)

S0, S1, S2 i S3 već imaju završene unose iznad s tačnim SHA i run id-em.

| Segment | Šta se upisuje |
|---|---|
| S4–S10 | po segmentu: popis fajlova, eventualne izmjene testova (s garancijom), gzip delta po chunku, CI run id, otvorena pitanja |
| S11 | brisanje starih šablona (grep dokaz 0 potrošača), `a11y-aurum.spec.ts`, docs sync, konačni broj testova, konačni run id, preostale 🟡/➖ stavke |

---

## Šablon za unos segmenta

```
## YYYY-MM-DD · S<n> · <kratki naslov>

Šta: ...
Zašto: ...
Fajlovi: ... (novo / izmjena / brisanje)
Testovi: novi ...; ažurirani ... (garancija zadržana, razlog ...); puna petlja N/N
CI: run <id> — 5/5 success; bundle ... KiB / 300
Dokazi: ✅ ... / 🟡 ... / ❌ ... / ➖ ...
Otvoreno: ... (ili "nema")
```

## 11. S4 realizacija (2026-11-11) — predaja S5

**Odobrenje:** `ask_user s4_approval` → **`approve_s4`** („plan → implementacija → 5/5 CI → evidencija → STOP"; `PublicFeatureGate` bez nove odluke netaknut).

**Implementirano:** commit **`7d2ab0e`** (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`), **12 fajlova / +220 −40**. 6 javnih tokova (`/rezervacija`, `/moj-termin/:token`, `/moje-rezervacije`, `/moje-rezervacije/:id`, `/unsubscribe`, `/profil`) + `my-reservation-card`, `payment-summary-block`, `media-consent-panel` u 3 stanja teme kroz `useTheme()` (prije early return-a), `publicAurum.*` i `data-aurum-*`. `globals.css` dobio **130 append-only Aurum-only linija** (marker `:811`, `postcss.parse` 110 pravila; S2 `:432` / S3 `:646` netaknuti). `<time dateTime>` ×3; 2 nova BS/EN ključa s interpolacijom (**2730/2730**); `window.confirm` za povlačenje saglasnosti zamijenjen `ConfirmDialog`-om (Radix, `isDestructive`, povratak fokusa). **O4 ostaje otvoreno za S6–S9** — diran je samo javni `media-consent-panel.tsx` po S4 DoD-u.

**Nulta promjena (grep `git diff -U0`):** koraci 1–4 i `setStep`, `disabled` uslovi, `service/date/slot`, validacije, `B`/`steps` semantika (`role="progressbar"` + `aria-valuetext`), `aria-pressed`, poruke grešaka uz polje, poziv kreiranja, `Idempotency-Key`/`bookingAttemptRef`, backend dostupnost, statusi, `datesRequestIdRef`/`slotsRequestIdRef`/`requestIdRef`, OTP `autoComplete="one-time-code"`, error mapping, API ugovori, `queryKeys`, `'availability:changed'`, `PublicFeatureGate`, `/backend`, `/mobile`, `package-lock.json`, `frontend/package.json`, `ci.yml`. Nema novih zavisnosti, novih `test:*` skripti ni izmjene ijednog source-contract testa.

**Lokalno izmjereno:** **204/204** `test:*`; 5 Python gate-ova (`check_repo_hygiene` 1789, `check_ci_index` 385/388, `check_doc_links` 687/222, `check_i18n` **2730/2730**, `check_ui_contrast` **140/140 source-only**); build **281,3/300 KiB** (+0,4 prema S3); `typecheck:e2e` 0; `lint` 0 grešaka / 7 poznatih warninga; `git diff --check` čist.

**CI dokaz:** run **`43177106881`** = **5/5 success** (`headSha` = gornji SHA); `a11y-e2e` job **`131043916664`**: **252 passed | 0 failed | 0 skipped (2.5m)** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report` ID **`13924239127`** / 331564 B / SHA256 `735f02371338766b49288e49bddd249112f148e037ff5d6a3c001502edcb6ae2`. Coverage log i dalje: `1.4.3` NEPOTPUNO (8 ruta / 18 čvorova), `2.5.3` NEPOTPUNO (22 čvora), `1.4.6` AAA **PAD** (28 violations / 70 čvorova). **Ne tvrdi se WCAG 2.2/AAA usklađenost** niti rendered axe za `aurum-light`/`aurum-dark`.

**Obrazložena odstupanja:** `PageHeader`/`FormSection`/`aria-current` na koracima (zabranjena promjena `B`/`steps` semantike), `DataTable`/`StatusBadge` za kartičnu listu (tražio bi drugačiji API payload → STOP uvjet), `test:public-reservation-error` iz plana ne postoji (stvarni `test:reservation-errors` + `test:public-reservation-accessibility` + `test:client-reservation-errors` + `test:campaign-unsubscribe-recovery` su zeleni), `ConfirmDialog` za otkazivanje rezervacije (već `CancelReservationDialog`; zamjena bi dirala validaciju razloga). Detalj u `05_phase-4-public-flows.md` §10.

**Šta još NIJE dokazano (🟡 do S11):** rendered axe nad `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA, tastaturni end-to-end kroz 4 koraka rezervacije.

**Za S5:** čeka **STOP + eksplicitno odobrenje** (auth + onboarding + NotFound), uz već najavljeno pitanje O2 o mjestu `ThemeSwitcher`-a na ekranima bez layouta.

---

## 12. S5 odluka vlasnika (2026-11-11) — zabilježeno PRIJE implementacije

**Odobrenje:** `ask_user s5_approval` → **`approve_s5`**: „Po istom režimu: plan → implementacija → 5/5 CI → evidencija → STOP. Bez diranja auth tokova, guardova, poruka grešaka, PublicFeatureGate-a i bez novih odluka o paleti."

**O2 (`s5_theme_switcher_place`) → `card_header`:** `ThemeSwitcher` na `/login`, `/register`, `/reset-password`, `/force-change-password`, oba onboarding ekrana i `NotFound` stoji **u zaglavlju auth kartice**, uz logo i postojeći `LanguageSwitcher`, **iznad `<h1>`** — ne ispod forme. Time je O2 iz `HANDOFF.md` zatvoreno; NEJRA §12 se ne tumači dodatno. `06_phase-5-auth-exceptions.md` §4/§9 su ažurirani istom odlukom.

**Obaveza:** nijedan redoslijed polja, `<h1>`, primarni CTA, `autocomplete`, OTP paste, busy/stale zaštita, error mapping, guard ni `PublicFeatureGate` ne smije se promijeniti. `components/ui/otp-input.tsx` ostaje bez izmjene (3.3.8). O4 (`window.confirm` u adminu) i dalje čeka S6–S9.

---

## 13. S5 realizacija (2026-11-11) — predaja S6

**Odobrenje:** `ask_user s5_approval` → **`approve_s5`**; **O2 = `card_header`** (zaglavlje kartice, iznad `<h1>`), zabilježeno u §12 **prije implementacije**.

**Implementirano:** commit **`90acca2`** (`90acca29ec760a48a0dea489c6f004c2d9409780`), **13 fajlova / +156 −24**. Novi `features/auth/auth-card-header.tsx` (`ThemeSwitcher` + `LanguageSwitcher`), 7 ekrana (`Login`, `Register`, `ResetPassword`, `ForceChangePassword`, `OnboardingGender`, `OnboardingEmail`, `NotFound`) + dijeljeni `components/OnboardingShell.tsx` + `globals.css` (**84 append-only Aurum-only linije**, `postcss.parse` 124 pravila). `NotFound` dobio jedan `<h1>`. **Bez `useTheme()`**: oba Aurum stanja dijele iste tokene, pa je dovoljan `[data-skin="aurum"]` CSS — nema novih hookova ni rizika za `test:hooks-order`. S2/S3/S4 blokovi netaknuti; nema novih CSS promjenljivih ni tvrdih boja.

**Nulta promjena (`git diff -U0`):** auth endpointi, guardovi, error mapping, `minLength`, `autoComplete`, `aria-busy`/`role`, `fieldset/legend`, OTP paste, `otp-input.tsx`, token cleanup, svi `*Generation`/`*InFlight` refovi, `PublicFeatureGate`, `app/router.tsx`, `/backend`, `/mobile`, `package-lock.json`, `frontend/package.json`, `ci.yml`, `bs.json`/`en.json` (**2730/2730**, bez novih ključeva). Nijedan test nije diran; nema novih skripti ni zavisnosti.

**Lokalno:** **204/204** `test:*`; 5 Python gate-ova; **140/140** source-only kontrast; build **281,6/300 KiB** (+0,3 prema S4); `typecheck:e2e` 0; `lint` 0/7; `git diff --check` čist.

**CI:** run **`43181880043`** = **5/5 success**; `a11y-e2e` job **`131059574192`** = **252 passed | 0 failed | 0 skipped (2.4m)** / 32 rute na **default `classic`**, artifact **`13926547985`** / 331785 B / SHA256 `327fbb67622b9e59667d929fb12babfafcaf31ea67d7ff0fd4f12afa117042f5`. Coverage `2.5.3`: `passed 9 / incomplete 22 / inapplicable 1` (prije 6/22/4) zbog 4 nova pristupačna dugmeta na `/login` i `/register`; **0 violations**. `1.4.3`/`2.5.3` i `1.4.6` AAA (28/70) ostaju nepotpuni/pad — **bez tvrdnje o WCAG 2.2/AAA**.

**Odstupanja:** jedan veliki auth-card komponent (zaključani `<h1>` regexi) → mali `AuthCardHeader`; nove primitive / sažetak grešaka / novi i18n ključevi → ➖ uz obrazloženje u `06_phase-5-auth-exceptions.md` §10.

**Šta još NIJE dokazano (🟡 do S11):** rendered axe za `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA, rendered fokus-redoslijed kroz auth tokove, tastaturni end-to-end kroz 4 koraka rezervacije.

**Za S6:** čeka **STOP + eksplicitno odobrenje**; O3 (grupisanje navigacije + `ThemeSwitcher` u fullscreen kalendaru) i O4 (`window.confirm` u adminu) se postavljaju na tom STOP-u.

---

## 14. S6 odluke vlasnika — prije implementacije

S6 odobren (`approve_s6`) uz režim plan → implementacija → 5/5 CI → evidencija → STOP. O3: `group_with_map`, zatim eksplicitno `approve_map_a`: sedam sekcija se grupiše u pet bez promjene hrefova ili dodavanja redirecta. Pregled: `/admin`, `/admin/analytics`; Operacije: `/admin/reservations`, `/admin/daily-log`, `/admin/finance`, `/admin/loyalty`; Salon: `/admin/salon`, `/admin/services`, `/admin/stylists`, `/admin/users`; Sadržaj: `/admin/blog`, `/admin/gallery`, `/admin/reviews`; Sistem: `/admin/settings?tab=site`, `?tab=releases`, `?tab=notifications`, `?tab=email`. Svih 17 postojećih navigacijskih hrefova mapiraju se na sebe; postojeći redirecti nisu dio izmjene. Osam `TabRedirect` ruta čuva druge query parametre uz zamjenu `tab`, dok postojeći `/admin/debtors` koristi obični `Navigate` i ne čuva proizvoljni query. Ispravlja se prethodni usmeni tipfeler `/admin/debters`.

`calendar_header`: ThemeSwitcher u zaglavlju fullscreen kalendara. O4 `allow_s7_s9`: eventualna zamjena admin `window.confirm` samo u S7–S9 uz istu poruku, uvjet i efekat; ne u S6. Nema novih KPI-ja, izvora, zavisnosti ili izmjene API-ja, guardova i filtera.

**Dashboard STOP — `preserve_existing`:** vlasnik je odobrio da S6 zadrži postojeće KPI-je, izvore, izračune i filtere; razlika prema ilustrativnim KPI-jima NEJRA §05 evidentira se kao odstupanje. Nema novih KPI-ja ni filtera.

**S6 test addition:** `test:shell-a11y` imports `s6-presentation.test.mjs`, adding checks for the five approved groups, all 17 original hrefs, and the standalone calendar skip target and header switchers; no existing assertion was removed or weakened.

## 15. Revidirani smjer i odobrenje temelja — prije implementacije

Vlasnik traži potpuni novi identitet cijelog weba, zadržava Aurum paletu i traži komponentni standard, premium/unikatan izgled, suptilno kretanje i WCAG 2.2 AA minimum, poželjno AAA. Referenca je inspiracija, ne ograničenje. Koncept `docs/design/aurum-novi-identitet-koncept.html` odobren je kao smjer; ovo nije dokaz WCAG usklađenosti. Raniji S2–S4 trebaju novu realizaciju, a S6 WIP ostaje sačuvan.

`approve_foundation`: administrator bira aktivni identitet i početni režim, korisnik pamti samo light/dark (`persist_mode`); primjenjuje se na cijeli web (`whole_web`), uz minimalni backend bez migracije (`allow_minimal_backend`). Zadano **Aurum + light** (`aurum_initial`, `light_initial`), uključujući prije završetka novog vizuelnog identiteta; `classic` skriva javni prekidač (`hide_when_classic`). Plan i verifikacija: [14_prvi-segment-globalni-izbor-teme.md](14_prvi-segment-globalni-izbor-teme.md).

**Razlog izmjene testa:** `theme-switcher-a11y` mijenja očekivanje tri korisnička dugmeta u dva i dodaje provjeru da se prekidač skriva za `classic`, jer vlasnik više ne dopušta klijentu izbor identiteta. Ostale a11y, fokus, lokalizacija i mutacijske provjere ostaju očuvane.

`test:theme-state` now imports the additional `theme-policy.test.mjs` checks so the existing CI entry exercises administrator precedence, local mode persistence, legacy migration and blocked storage; existing state assertions remain intact.

Dodat je runtime test `ThemeProvider` (React + JSDOM, preko postojećeg `test:theme-state` ulaza) koji provjerava administratorski skin, DOM atribute i očuvanje lokalne preferencije. To nije browser/a11y-e2e dokaz.

### CI recovery — foundation (u toku)
Nakon odobrenja ispravke, validacija globalne teme koristi registrovane kodove grešaka. Četiri admin stranice koriste postojeći semantički muted token umjesto slate-500; paleta se ne mijenja. Dekorativni drift hero pozadine traje 2s umjesto 28s ukupno kako bi se stvarno završio unutar postojećeg 3s preduvjeta axe mjerenja. Source test za tačno trajanje je ažuriran zbog namjerne promjene animacije; nije uklonjena provjera animacije niti smanjena pokrivenost kontrasta. Rendered rezultat i CI tek treba potvrditi.

### CI recovery — dark homepage (u toku)
Nakon odobrenja sanacije, home i footer koriste postojeće semantičke Aurum površine i tekst umjesto neskladnih legacy boja u tamnom režimu. Backend kodovi validacije teme imaju BS/EN mapiranje. Nema izmjene palete niti slabljenja axe testova; čeka se rendered rezultat.

## 16. Revidirani S6 — admin inkrement (CI u toku)

Ponovo upotrijebljen dio sačuvanog WIP-a: pet odobrenih grupa, 17 istih hrefova, kalendarski skip-link i prekidači, više postojećih podataka u mobilnim rezervacijskim karticama. Novi vizuelni tretman admin navigacije i dashboarda koristi postojeće tokene i dekorativne Lucide ikone; podaci i KPI formule nisu mijenjani. Dashboard zadržava postojeće zajedničke admin primitive, a lokalni eksperimentalni `aurum-stat-grid.tsx` nije dio commita. Dodat source test ikona i šest autentificiranih axe scenarija u light/dark; postojeći testovi nisu uklonjeni niti oslabljeni. Ostatak S6 i kompletni identitet nisu završeni.

### S6 sanacija dark kontrasta (CI u toku)
Nakon odobrenja, zajednička admin tabela i pozadine kalendarske biblioteke koriste postojeće semantičke Aurum tokene umjesto legacy boja; paleta i prethodne provjere nisu mijenjane. Dodat source test uparivanja; rezultat browser mjerenja potvrđuje se isključivo kroz a11y-e2e CI.

## 17. Revidirani S2 — naslovnica, inkrement (CI u toku)

Aurum naslovnica dobija lijevo poravnat editorial hero sa postojećom administratorskom fotografijom i sadržajem, asimetrične kartice prednosti te revidiran prikaz postojeće fotografije i sekcija widgeta. Promjene su ograničene na Aurum; `classic` zadržava prethodni vizuelni raspored. Nisu mijenjani izvori, feature gateovi, rute, akcije ni sadržaj. Dodani su source test stvarnih sadržaja i dva a11y-e2e testa na 320 px, uz reduced motion i axe za oba Aurum režima. Nijedan postojeći test nije uklonjen ni oslabljen. Lokalno 203/203 neinteraktivne frontend `test:*` skripte, pet Python gateova, build i e2e typecheck prolaze; lint 0 grešaka / 7 postojećih upozorenja. Rendered rezultat čeka CI; ručni pregled i ostale površine nisu završeni.

## 18. Dijeljene javne/auth/admin/stylist komponente — inkrement (CI u toku)

Javni sadržajni heroji i dijeljena admin/stylist zaglavlja imaju novi Aurum-scoped tretman; stylist navigacija ima dekorativne Lucide ikone uz iste rute, prevedene nazive i aria-current. Auth/onboarding `AuthCardHeader` sada uključuje postojeći konfigurirani logo/naziv (ili postojeći fallback logo) uz prekidače iznad naslova, čime je ispravljeno ranije odstupanje od odluke `card_header`. Classic dobija logo u auth zaglavlju, bez promjene poslovnih tokova. Dodane source provjere te 10 javnih/auth i četiri prijavljena stylist axe scenarija u oba režima; postojeći testovi nisu uklonjeni ni oslabljeni. Lokalno 203/203 neinteraktivne frontend skripte, pet gateova, build 285,1/300 KiB, lint 0 grešaka/7 upozorenja i e2e typecheck prolaze. CI i stvarni ručni pregled su na čekanju; protokol je u `15_rucni-pregled.md`. Ovo nije kompletan redizajn svih stranica niti dokaz WCAG usklađenosti.

CI `43239989029` za `3367d6f` bio je 4/5: 280 rendered testova prošlo, jedan pao na `/usluge` u Aurum dark (broj usluga: 1,16:1 zbog svijetlog teksta na bijeloj kartici). Kartica je u Aurumu vezana za postojeće semantičke `surface`, `line` i `text` tokene; paleta i test ostaju nepromijenjeni. Nova CI provjera je nužna. Artifact 13955170294, SHA256 c234c4ef63c04f8d7b475b684807035ef66f6765f4ed15209f8bb8593b4efab4.

## 19. Vizuelne korekcije naslovne i prekidača

Na zahtjev korisnika Aurum naslovna koristi urednički dvodijelni hero prema konceptu: tekst na semantičkoj površini i odvojena vidljiva slika (konfigurisana slika ima prednost; ranije odobrena AI ilustracija je dekorativni fallback, nije fotografija salona). Animacija ulaza ostaje pod postojećim `MotionConfig reducedMotion="user"`; izbjegnuto je animiranje teksta preko fotografije. Dodani su prevedeni galerija/blog urednički linkovi samo kad su odgovarajući feature flagovi uključeni, bez izmišljenih članaka/recenzija. Postojeći sadržaj i stanja učitavanja ostaju; classic ih ne prikazuje kao nove sekcije. Prekidač prikazuje samo Sun/Moon, s prevedenim sr-only imenima, statusom, stanjem i metama kao prije. Source test je preciziran jer ime više nije vidljivo; nije uklonjena provjera imena niti ijedan test. Nove rendered provjere i CI ostaju mjerilo, a ne dokaz potpunog WCAG-a ili ručnog pregleda.

CI `43272100212` (914e0aa): 4/5, 281 rendered testa prošla. Jedini pad bio je novog testa perzistencije: e2e `addInitScript` je sam brisao postavku pri svakom reloadu. Inicijalizacija tog scenarija ograničena je na prvi ulaz; tvrdnje o fokusu, stanju i perzistenciji ostaju iste. Slijedi ponovno izvršavanje CI-ja.

## 20. Novi kampanjski hero i jedna animirana ikonica

Na zahtjev korisnika prethodni split sa svijetlom površinom zamijenjen je tamnom kampanjskom kompozicijom sa novom AI ilustracijom kose kao dekorativnim fallbackom; administratorova hero slika i tekst ostaju prioritet. Tekst je na odvojenoj neprozirnoj postojećoj NEJRA hero površini radi kontrasta i nezavisnosti od slike. Slika i promjena ikonice imaju jednokratnu animaciju, obje isključene kod reduced motion. Novo jedino stabilno dugme prikazuje Sun u light i Moon u dark; `aria-pressed` označava dark, dostupno ime je prevedeno, promjena se najavljuje i fokus ostaje. Classic nema prekidač. Testovi starog dva-dugmeta ugovora ažurirani su za izričito novu korisničku odluku: i dalje provjeravaju oba režima, ime, stanje, mete, fokus, najavu, jezike, classic, mutacije te dodaju Enter/Space, perzistenciju i reduced-motion rendered provjeru. Izvorni test hero kontrasta NEJRA §07 ostaje kao historijska token provjera; nova kompozicija ima dodatni source test, rendered axe i dalje obavezan. Nema tvrdnje o ručnom ili potpunom WCAG pregledu.

## 21. Naslovna — početak pojedinačnog AAA audita

Na zahtjev korisnika dekorativna hero slika skrivena je ispod 768 CSS px samo u Aurumu; naslov i akcije ostaju. Dodana je rendered provjera mobilne skrivenosti i desktop vidljivosti. Počinje pojedinačni audit `/`: dodana je namjenska desktop light/dark axe AAA asertacija koja zapisuje i nepotpune nalaze, uz postojeće AA i mobilne testove. Ovo je početni mjerni korak, ne tvrdnja o AAA usklađenosti; sadržaj seed baze, zoom, sva dinamička stanja, tastatura i asistivne tehnologije zahtijevaju daljnju provjeru. Sljedeće stranice nisu obuhvaćene ovim inkrementom.

CI `43279270711` za `694635c`: 4/5; postojeći AA testovi i oba mobilna testa prolaze, dvije nove AAA desktop provjere padaju na kontrastu. Light: 12 čvorova (6,01:1 dugmad, 5,93–6,61:1 tekst), dark: jedno dugme 5,7:1. Upareni postojeći `text-muted-strong` i `text`/`surface` tokeni u pogođenim područjima; paleta nije mijenjana. Nalazi su početni i podaci seed baze ne pokrivaju sva stanja. Ponavljanje rendered provjere potrebno.

CI `43280349595` za `257a37f`: 5/5, desktop AAA axe asertacije za naslovnu prošle u light i dark na stanju izolovane CI baze; to nije potpuni WCAG audit niti pokriva sve podatke. Pregledom izvora pronađen je drugi problem naslovne: bočne liste transformacija automatski su se beskonačno pomjerale, bez pauze, uz duplikate fokusabilnih dugmadi. Zamijenjene su statičnim skrolabilnim listama; ručni izbor transformacije ostaje. BS/EN opis je usklađen i dodana source regresijska provjera. Promjena utiče i na classic jer je komponenta zajednička; opravdanje je pristupačnost i očuvanje funkcije izbora, ne kozmetički redizajn.

Proširen audit naslovne pokriva i testne popunjene transformacije/recenziju na 320 px i desktopu u oba režima, uz tastaturni klizač i AAA nalaze. Testni podaci presreću API samo u izolovanom Playwrightu, ne mijenjaju poslovne podatke. CI je potreban za rezultate.

CI `43281519526` za `9817353`: 4/5. Prazna desktop stanja i popunjeni dark mobile prošli su AAA axe; popunjeni light ima dodatne 5,93–6,38:1 tekstove, a desktop popunjeni dark otkrio je AA 2.5.3 neslaganje vidljivog i pristupačnog imena na sličicama. Korišten je postojeći `text-muted-strong`; vidljivi naziv sada ulazi u pristupačno ime zajedno s brojem transformacije, uključujući i razlikovanje mobilnih sličica. Ponovni rendered test je obavezan; paleta nije mijenjana.

## 22. Javno zaglavlje i meniji — AAA inkrement

Javno zaglavlje, mobilni drawer i portal korisničkog menija koriste postojeće Aurum semantičke površine, tekst, granice i fokus; classic nije obojen novim pravilima. Mobilni meni vraća fokus na okidač nakon zatvaranja, kontrole imaju 44 px, te su javni linkovi s ugniježđenim dugmadima pretvoreni u jedan `Button asChild` link bez promjene rute/funkcije. Test izvornog drawer ugovora je prilagođen dodatnim atributima, zadržava provjeru imena i dodaje fokus i zabranu ugniježđenih kontrola. Dodani su izolovani rendered AAA/AA testovi javnog mobilnog i prijavljenog korisničkog menija u oba režima; ovo ne dokazuje potpunu WCAG usklađenost, a stvarni CI rezultat i ručni pregled se čekaju.

CI `43287911946` za `a2a55bd`: 5/5, uključujući otvoreni javni mobilni i prijavljeni korisnički meni u oba Aurum režima, axe AA/AAA i fokus nakon zatvaranja; nije dokaz potpunog WCAG-a. Počinje pojedinačni audit `/usluge`: uklonjen ugniježđeni `main` (zadržan postojeći shell `main`), pristupačno ime usluge uključuje vidljivi naziv i trajanje, dugme za brisanje pretrage ima 44 px. Dodani izolovani testovi popunjenog kataloga i filtera bez rezultata za light/dark i 320px/desktop, sa AA/AAA axe, tastaturom i provjerom preljeva. CI je na čekanju.

CI `43289167654` za `d213874` (4/5) otkrio je na popunjenom katalogu: dark filter bijela površina/svijetli tekst 1,16:1 (AA), light dugmad 6,01:1 (AAA), te 2.5.3 na linku usluge. Pokušaj ručno sastavljenog aria-labela nije riješio axe; uklonjen je suvišni override tako da se ime linka računa iz stvarnog vidljivog naziva i trajanja. Source test prilagođen novom ugovoru i rendered test zadržan. Filter, input i odabrane kontrole koriste uparene postojeće semantičke tokene; paleta nije mijenjana. Potrebno novo CI mjerenje, uključujući dosad nedostupno stanje bez rezultata.

CI `43290465660` za `f202b08`: 4/5. Popunjena stanja oba režima i dark bez rezultata nemaju AA/AAA axe prekršaja; light bez rezultata otkriva još tri AAA kontrasta (5,93–6,38:1). Korišteni su postojeći jači tokeni za reset i prazno stanje. Axe je u popunjenom stanju prijavio nepotpune AA kontrastne provjere (light 2, dark 1), koje ostaju otvorene za ručni pregled; ne proglašavaju se prolazom.

CI `43291453468` za `2b3bd42` (4/5): preostao jedan isti AAA nalaz na akciji praznog stanja; ranije opšte pravilo za legacy klasu imalo je veću CSS specifičnost. Preciziran je selektor postojećeg para tokena, uz nepromijenjen test i paletu. Ponavlja se CI.

## 23. `/usluge` — dodatna pojedinačna stanja

Nastavak audita ove stranice: dugačak naziv kategorije sada se prelama umjesto skraćivanja; prostor u polju pretrage uvećan je za 44px dugme. Prošireni su testovi tastaturnog izbora kategorije i stvarnog prikaza dugog naziva, AAA/AA skeniranja praznog kataloga i greške uz oporavak, te zapis tačnih nepotpunih axe nalaza. Nema izmjena palete niti testnih popuštanja; CI i ručne provjere su na čekanju.

CI `43306548987` za `5e0ae7f` je 5/5. Detaljni axe izlaz upozorio je da istraži-katalog link ima 1:1 kao nepotpun nalaz, a broj kategorije je preklopljen dekorativnim slojem. Link je vezan na postojeći `text`/`surface` par, a dekorativni sjaj je isključen samo na Aurum karticama uz eksplicitnu površinu broja; dodana je provjera različitosti izračunatih boja. Nema izmjene palete. Potreban je novi CI i ostale ručne provjere.

## 24. `/usluge` — prijavljeni kontrast konfigurisanog sadržaja

Korisničke slike su pokazale nečitljive kartice koraka, značke i hover ikonu u tamnom režimu. Prethodna tvrdnja bez nalaza važila je samo za ograničen testni sadržaj, ne stvarne postavke ni hover. Uparene su postojeće semantičke boje površine i teksta za te dijelove i opis preko slike; proširen je fixture na administratorski uređene korake i oznake te hover linka u oba režima. Potrebni su CI i ručni vizualni pregled stvarnog sadržaja.

## 25. Detalji usluge — kontrast i struktura

Na osnovu korisničke slike upareni su semantički tekst/površina za cijenu, trajanje, kategoriju, kontaktne linkove i praznu galeriju; sadržaj preko hero slike dobio je čvrstu površinu. Uklonjen je ugniježđeni `main`, omogućeno prelamanje dugih naslova i kontakata. Dodani su render testovi stvarnih polja i kontaktnih postavki, prazne i popunjene galerije, hover stanja, oba režima i 320px; čekaju CI. Ručni pregled ostaje obavezan.

CI `43313496364` (4/5) otkrio je dodatne AAA nalaze na znački kategorije i kontaktima u zajedničkom footeru, te nepotpun nalaz na rezervacijskom CTA-u. Ispravljeni su postojeći parovi tokena; dekorativni krug koji je preklapao link uklonjen je samo na detalju usluge. Render testovi se ponavljaju.

## 26. Dorada rasporeda prema korisničkim slikama

Uklonjen duplirani naslov i kategorija preko slike detalja i prateći nepotrebni overlay; naslov i alt slike ostaju. Uklonjena je vanjska bijela površina i dupli donji razmak koji su pravili bijelu traku. Opis preko slike na `/usluge` spušten je na većim ekranima uz očuvan razmak od oznake broja; na malim ekranima zadržan je veći sigurnosni razmak. Dodane su regresijske provjere slike, dugog naslova, bijelog omotača i položaja; potrebna je i vizualna provjera sa stvarnim sadržajem.

## 27. Prijavljeni vizualni problemi na više tokova

Na `/usluge` brojevi koraka više se ne skupljaju niti prelamaju; lightbox galerije je prilagođen veličini slike i centru, sa skrolom i jasnim kontrolama. U rezervaciji su trajanja, odabrani servisi i kalendar vezani na površinu/tekst aktivne palete, a nedostupni datumi su čitljivi i označeni precrtavanjem. Javna pozadina sada prati temu (uključujući profil), kao i account meni; legacy kartice stilističkog shella prelaze na Aurum površinu. Dodani su izolovani render fixture testovi za modal, korake, rezervaciju/profil i popunjenu stilističku knjigu. Ovo nije kompletan pregled svih stanja stilističkog dijela; CI i ručna provjera su potrebni.

CI `43383083628` je otkrio stvarni gubitak fokusa po zatvaranju lightboxa: okidač se sada eksplicitno vraća u fokus. Statički test skip-linka usklađen je s novim identifikatorom shella bez uklanjanja provjere. Rezervacijski fixture dopunjen je završenim onboardingom, da test ne mjeri redirect. CI se ponavlja.

CI `43383917572` / `43384745786`: lightbox i popunjeni stylist fixture prolaze; u izolovanom rezervacijskom fixture-u prelazak na profil nije uspješno obnovio sesiju. Provjera profila prebačena je u postojeći projekat sa stvarnom izolovanom CI prijavom umjesto lažnog tokena. Rezervacijski fixture zadržava provjere izbora i kalendara.

## 28. Inventar preostalog javnog portala

Provjerene su deklarirane javne i auth rute i pokrivenost testovima. Otkriven i ispravljen ugniježđeni `main` na `/unsubscribe`; zadržani su status, akcije i testiran shell landmark. Posljednji prethodni CI `43387264619` (5/5) ne predstavlja završni AAA audit cijelog portala: namjenski AAA/AA fixture-i obuhvataju naslovnu, katalog, detalj usluge i lightbox; `/blog`, `/galerija`, `/kontakt`, `/register` imaju osnovni render u obje teme, ne sve podatke/stanja; rezervacija ima test odabira i kalendara, ali ne sve slotove, potvrdu i greške. Profil ima provjeru pozadine, ne cjelovit audit. Blog detalj, recenzije, korisničke rezervacije i detalj/token, unsubscribe i auth/onboarding zahtijevaju pojedinačni pregled sa stvarnim reprezentativnim podacima, u oba jezika i teme, uključujući mobilni prikaz, interakcije, greške i oporavak. Ručni protokol u `15_rucni-pregled.md` nije izvršen. Automatizirani axe ne dokazuje potpunu usklađenost.

## 29. Javni portal — rezervacijski tok po stanjima

Započet dodatni render audit rezervacije: izolovani testni klijent, pretraga i odabir usluge, greška i ponovni pokušaj za datume i termine, raspoloživ i zauzet termin, napomena, dugovanje, loyalty i simulirana potvrda s provjerom payload-a. Axe AA/AAA i reflow mjere se po stanjima u obje teme i na 320px/desktop; CI je potreban za nalaze. Nema stvarnog slanja ili promjena u bazi.

CI `43391943282` je pronašao nedovoljan AAA kontrast pomoćnog teksta u svijetlom i odabranog termina u tamnom režimu. U rezervaciji su upotrijebljeni postojeći jaki parovi teksta i površine te uklonjena prozirnost odabranog termina. Axe je prijavio i nepotpune provjere pojedinačnih dekorativnih brojeva napretka i praznog polja; nisu dokaz prolaza i zahtijevaju ručni pregled. Ponoviti render audit.

CI `43392953499`: tamni tok je prošao sva ciljna stanja i simuliranu potvrdu; svijetli je pokazao dodatni AAA nalaz na outline akcijama (globalni legacy selektor je prepoznao dark hover klasu kao primarnu). Na rezervaciji je vraćen semantički površina/tekst par za te akcije; ostale faze svijetlog toka čekaju ponovljeni CI.

CI `43393860257` pokazao je da je postojeći `:is(button, a[href])` selektor specifičniji nego prethodna korekcija; selektor outline akcija je sada preciziran većom specifičnošću. Nije spušten prag testa.
CI `43394701302` potvrđuje prolaz svijetlih stanja do sažetka, gdje je otkrivena prednost starog selektora nad odabranim terminom i slab kontrast vrijednosti loyalty polja. Dodata specifičnost za termin i uparene boje polja; ponovna provjera je potrebna.

### Blog detalj — početak pojedinačnog pregleda
- Naslov hero sekcije učestvuje u rasporedu umjesto apsolutnog pozicioniranja, uz tamnu rezervnu podlogu; dugi naslov, sadržaj i komentari se prelamaju, a mediji ne prelaze širinu.
- Zamijenjena ugniježđena interaktivna kontrola za prijavu u komentarima jednim linkom sa stilom dugmeta; sačuvana povratna ruta.
- Dodani renderirani scenariji s popunjenim člankom, dugim sadržajem, greškom i tastaturnim ponavljanjem učitavanja komentara, u obje teme i na 320 px/desktop. CI je potreban za rezultat; ručni pregled i ostala stanja ostaju otvoreni.
- CI `43397604353`: tamni scenariji prolaze, svijetli otkrio nedovoljan kontrast povratne, share i outline akcije; hero je označen za ručnu provjeru zbog gradijenta. Upareni su tokeni za akcije, a naslov/datumski tekst dobio neprozirnu tamnu podlogu neovisnu o slici. Ponovna CI provjera slijedi.
- CI `43398627520`: greška komentara i oba tamna scenarija prolaze bez axe violations/incomplete; kod popunjenog komentara u svijetloj temi datum je bio 6.38:1. Datum koristi jači semantički token; potrebna ponovna provjera.

### Urednički redizajn bloga i stapanje homepage fotografije
- Na zahtjev korisnika Aurum lista bloga dobila je prostran urednički uvod, istaknutu prvu objavu i kartice s čitljivom tipografijom; postojeći podaci, postavke, paginacija i Classic ostaju.
- Detalj objave sada ima naslov i datum iznad velike fotografije, umjesto prekrivenog i odrezanog hero prikaza. Prijava, dijeljenje i komentari ostaju dostupni.
- Desktop hero fotografija na naslovnoj ima postepeno maskirane sve rubove; mobilna fotografija ostaje skrivena. Dodani su renderirani testovi popunjene liste i položaja fotografije detalja; vizuelni pregled stvarnih fotografija još je potreban.

### Dorada bloga prema screenshotovima
- Ispravljen prelazak fotografije preko teksta istaknute objave: oba stupca su skupljiva, a fotografija je ograničena vlastitim okvirom; dodana provjera geometrije s realnom učitanom slikom i dugim naslovom.
- Smanjena tipografija i razmaci, dodana urednička oznaka izdvojene priče, suptilni akcenti i sažetak u zaglavlju detalja kada postoji. Desktop i mobilni omjeri fotografije detalja prilagođeni; homepage ostaje netaknut.
- Lokalni build, i18n, pristupačnost liste i E2E typecheck prolaze; renderirani testovi i vizuelna provjera sa stvarnim sadržajem ostaju potrebni.

### Portalne površine — palette fix
- Pronađen uzrok: Tailwind `dark:bg-slate-950` generiše se nakon lokalnih pravila i istom specifičnošću nadjačava prethodni Aurum background; portali se također nalaze izvan layouta. Prijašnji testovi su provjeravali kontrast, ali ne i stvarnu boju.
- Centralno označene zajedničke Radix površine dijaloga, ladica, menija i podmenija, s dovoljno specifičnim Aurum uparenim tokenima te stilom fokusiranih stavki i kontrola u dijalozima. Classic nije obuhvaćen pravilima.
- E2E sada direktno poredi stvarnu boju galerijskog dijaloga, korisničkog menija i ladice novog unosa s `--surface` u obje teme. Druga hardkodirana slate mjesta (uključujući zasebne kontrole i admin) nisu automatski proglašena pregledanim; široka zamjena svih slate klasa mogla bi poništiti semantičke boje i stanja.
- CI `43407635665`: galerija i meni prolaze novu provjeru stvarnih boja; test ladice je naišao na preusmjeravanje zbog nemokiranog autentificiranog API-ja klijenata. Dodani izolirani odgovori za klijente i usluge; ponovna provjera u toku.

### AA/AAA pregled — kontakt i zadovoljni klijenti
- Otkriven postojeći ozbiljan funkcionalni problem: kontakt forma je nakon timeouta prijavljivala uspjeh bez slanja. Zamijenjena je jasno označenim otvaranjem korisnikove email aplikacije (mailto); korisnik sam šalje poruku. Polja su obavezna, unos se ne briše i ne tvrdi se da je email poslan. To nije serversko slanje; potreban je podešen email klijent.
- Dodani renderirani testovi AA + AAA prijavljenih nalaza za kontakt (popunjena forma i radno vrijeme greška/retry) i zadovoljni klijenti (greška/retry, popunjen slider, tastatura), 320px i desktop, obje teme. CI je potreban; ručna provjera i ostale rute/stanja nisu završeni.
- CI `43421095057` otkrio je AAA kontrast sekundarnog teksta i outline akcija u svijetlom kontaktu i prikazu zadovoljnih klijenata; tamni scenariji prolaze (kontakt hero gradijent ostaje `incomplete` za ručni pregled). Sekundarni tekst, polja i outline akcije sada koriste odgovarajuće uparene tokene; ponovna CI provjera slijedi.
- CI `43422102805`: zadovoljni klijenti prolaze obje teme i oba prikaza; popunjena svijetla kontakt polja pokazala su da opći selektor nadjačava prethodnu korekciju. Povećana specifičnost selektora polja bez izmjene kriterija testa.

### Stilistička dnevna knjiga — odabir klijenta i servisa
- Uzrok: odabrani klijent se čitao iz promjenjivog rezultata pretrage. Nakon odabira je cijelo ime pokretalo novi API upit, koji može vratiti praznu listu (ime i prezime su zasebna polja), pa je `selectedClient` nestajao iako je tekst ostao vidljiv. Bez spola odabranog klijenta kontrola servisa se isključi.
- Odabrani klijent čuva se zasebno, pretraga se ne pokreće za već odabranog klijenta; izmjena klijenta briše izbor servisa i iznose. Filtriranje po spolu i postojeća validacija ostaju.
- Dodan E2E s realističnim praznim odgovorom na puno ime, oba spola servisa i promjenom klijenta, te source regresija. Lokalni build i testovi prolaze; potrebno provjeriti CI i stvarne podatke.

### Admin dashboard — prvi inkrement
- Vlasnik je zatvorio javnu fazu (ručni AA pregled ostaje dokumentovan kao neizvršen) i odobrio intenzivan rad na adminu. Zatečeni neversionirani `frontend/src/features/dashboard/aurum-stat-grid.tsx` ostaje netaknut i nije uključen.
- Pregled `/admin`: novi brzi pristup postojećim rutama, jasnija hijerarhija zaglavlja, operativnih/finansijskih kartica s ikonama i tabele, bez izmišljenih podataka ili izmjena formula. Rezervacije su ispred tehničke dijagnostike; uloga i replay zaštite ostaju.
- Djelimični pad izvora sada ne prikazuje lažne nule: zavisne vrijednosti označene su „Nije dostupno”; pad sažetka rezervacija nije prikazan kao prazna lista. Dodani su testovi parcijalnog pada i renderirani AA/AAA izvještaj za desktop/320px u obje teme. Lokalni build i source testovi prolaze; CI i stvarni vizuelni/ručni pregled ostaju potrebni. Ovo nije završetak admina niti potvrda WCAG usklađenosti.
- CI `43427320924`: SSR smoke je tražio novu obaveznu `failedSources` vrijednost u fixtureu, a mobilni axe je našao da scrollable tabela nije fokusabilna tastaturom. Fixture sada prosljeđuje stanje izvora, a zajednička tabela ima imenovanu fokusabilnu regiju; 42/42 SSR smoke lokalno prolazi. Rerun slijedi.
- CI `43428294663`: renderirani a11y job prošao, ali lint ne dopušta statički `tabIndex` na regiji. Fokus se sada dodaje samo kada tabela zaista horizontalno prelijeva, uz praćenje promjene dimenzija; lokalno lint, smoke i build prolaze. Ponovni CI je potreban.

## 30. Admin dashboard — Faza C: strukturna adopcija i tokenizacija (C 9/–15/)

Owner je odobrio admin fazu nakon zatvaranja javne. Svi batchevi uvoditi `<Button>`/`<DataTable>`/`<Select>`/Semantičke tokene umjesto sirovih slate-zinc-neutral gray skala; javne stranice, auth flow i `components/ui` se ne diraju; `aurum-stat-grid.tsx` (neversionirani WIP) netaknut. CI je praćen za svaki push.

- **Faza C (9/) `ca17234`**: pilot DataTable onRowClick + Stylists/Users adopcija djeljenih primitiva (Select); 71 adopcioni plan (C (7/)) apliciran na svih 14 admin stranica; source-contract testovi prepravljeni da prate adopciju.
- **Faza C (10/) `eaf51ec`**: DataTable + app-table th tokenizacija (HEAD_ROW/BODY_ROW); `data-default-card-surface` parovi preko djeljenih klasa.
- **Faza C (11/) `4d5ec65`**: blog admin tabela — migracija na `<DataTable>`; a11y regression test ažuriran.
- **Faza C (12/) `1d2bf6b`**: preostali slate ostati u Analytics/Reviews/invoice-preview tokenizirani (`dark:ring-offset-slate-950` → `ring-offset-surface` i sl.).
- **Faza C (13/) `d924f70`**: masovna tokenizacija text-slate-900/950 parova (~40 fajlova); `text-slate-400` allowlist unos (settings-module-page Search ikona) tokeniziran i unos obrisan; ratchet pragovi `text-contrast-allowlist` (scanned ≥300 / skippedDark ≥50, izmjereno 313/60) i `stylist-dark-contrast-a11y` (strukturalni file-walk ≥15 fajlova umjesto fiksnog praga broja paleta-klasa, koji nakon tokenizacije više nema smisla — 2 amber-700 zadržana sa dark pratiocima). CI `44277411543` — **5/5 zeleno.**
- **Faza C (14/) `3cbab1d`**: masovna tokenizacija text/border/bg slate → semantički tokeni (~51 fajl): svjetli tekst/okviri/površine su sada svi preko djeljenih tokena (`surface*`/`content*`/`line`/`control-border`/`surface-inverse`); 1.4.11 granice upload dropzone/panela → `border-control-border`; workbook reschedule switch „on“ → `bg-surface-inverse`; profile h1 → `text-content`. Javne i auth stranice (Login/Register/ResetPassword/NotFound/ForceChangePassword/onboarding) i `components/ui` netaknuti; prazne zvijezdice u Reviews/ClientAnalytics zadržane (allowlistirane, dekoracija). Lokalno: full `test:*` sweep ZERO grešaka, build 291.8 KiB gzip (budget 300), eslint 0 grešaka, 140/140 kontrast parova, hygiene/i18n/diff-check čisti. CI `44279398623` — rezultat prati se.
- **Faza C (15/)**: `text-muted-foreground` (mrtva utility klasa — nije mapirana u tailwind configu; bojila se samo kroz `[data-skin="aurum"] [data-users-dialog]` patch selektor) zamijenjena sa `text-content-muted` u AppReleases/Gallery/Services/app-release-create-form (23 mjesta). Classic prikaz se mijenja s ničega na propisanu muted boju; Aurum prikaz ostaje konzistentan.
- Svjesna zadržavanja nakon C: **public run exception** (`public/` stranice, auth flow, onboarding, `components/ui` i `src/lib/toast/toaster.tsx` dark-toast estetika — netaknuti), dekorativne prazne zvijezdice (`text-slate-200/300` s `dark:text-content-strong`). Preostalih 14 slate mjesta u admin scope su javno-portal izuzetak (`public-blog-comments.tsx`) i 2 allowlistirane zvijezdice.

### Faza D (1/) — mrtvi patch selektori (query-audit nad runtime src + Radix/vendor poznati atributi)
- Sistematski audit 341 `[data-skin="aurum"]` pravila: za svaki selektor izdvojeni su klasa/attr/`[class*=]` referensi i prebrojano u **runtime** izvoru (tsx/ts; testovi/labeli/komentari isključeni). Uklonjena su samo pravila/alternative bez ijednog runtime pogodka:
  - `[class*="border-blue-"]` iz border-panele grupe (0 pogodaka; bg/text-blue alternative zadržane — Notifications koristi `bg-blue-50/80`);
  - rezervacija (`[data-aurum-page="reserve"] button[class~="shadow-slate-900/5"]` + `:hover`) — cijela dva pravila;
  - blog-post članak (`:is(button, a[href])[class~="shadow-slate-900/5"]` + prva alternativa hover grupe) — zadržana `border-transparent`/`text-slate-600` grana;
  - kontakt/zadovoljni klijenti (2 pravila `shadow-slate-900/5`);
  - users-dialog: `select[class~="bg-white"]` alternativa, `button[class~="bg-slate-900"]` + `:hover:not(:disabled)` (0 runtime `bg-slate-900` klasa u scope-u), `.text-muted-foreground` alternativa (mrtva klasa — C (15/));
  - stylist-shell `:is(button, a)[class~="bg-slate-900"]`.
- **Zadržano namjerno:** `.rbc-today`/`.rbc-time-gutter` (vendor klase react-big-calendar — nevidljive grep-u, ali dolaze iz biblioteke), `[data-highlighted]` (Radix postavlja runtime atribut), sva pravila s javnim/dev patch targetovima (javne Aurum stranice i dalje koriste sirove klase), `:focus-visible`, `forced-colors`, prefers-reduced-motion.
- Lokalno: build PASS (291.6 KiB / 300), **svih 204 `test:*` paketa** prolazi, contrast 140/140, hygiene + i18n + diff-check + tsc + lint (0 grešaka) čisti. CI se prati.

### Faza D (2/) — admin-closure trim (import-closure 255 fajlova)
- Za admin-scoped selektore (`[data-users-dialog]`, `[data-analytics-hub]`, `.admin-shell`, `[data-admin-users]`…) napravljena je tranzitivna import-closure (admin rute + DashboardLayout + stylist rute/layouti/featureri, 255 fajlova) i u njoj provjereni svi klasa-tokeni; sve javne/stanice/auth grane namjerno isključene jer scoped pravila tamo ne mogu pogoditi.
- Uklonjene su samo alternative sa 0 pojavljivanja u closure-u: `.text-slate-800` iz `[data-client-analytics-dialog] :is(…)` i iz `.admin-shell [data-analytics-hub] :is(…)` (obje liste zadržale ostale, žive alternative), `.border-slate-100` iz `[data-analytics-hub]` border pravila.
- Namjerno zadržano: `.rbc-today`/`.rbc-time-gutter` (vendor react-big-calendar — pogodak postoji samo u biblioteci, ne u izvoru; brisanje bi pokvarilo aurum kalendar), sve alternative sa shared `components/ui` pogocima (app-logo, button/badge/accordion/drawer/textarea itd. — dijele ih javne i admin površine).
- Lokalno: build PASS (291.6 KiB / 300), svih 204 test:* paketa 0 grešaka, diff-check čist. CI se prati.

### Faza D (3/) — zatvaranje admin teme i Faze D
- Owner vizuelna provjera (2026-11-18) prošla za admin dashboard i faze C/D; odluka: **admin faza se zatvara**.
- Završni sweep: jedini stvarni sirovi slate u admin scope-u bio je `settings/types.ts` `gray: 'text-slate-500'` (ikona postavki grupe) → `text-content-muted`; rezervna skeniranja potvrđuju da preostali admin pogodci su (a) javni client-reservations/public-shell (izuzetak — javni portal), (b) dvije allowlistirane dekorativne praznine zvijezdice (Reviews/ClientAnalytics), (c) `translate-*` klase (lažni pogodci).
- **Zadržano namjerno (odluka uz ownerovu vizuelnu potvrdu):** `[data-skin="aurum"]` patch CSS za javne/auth/onboarding Aurum površine i dijeljene `components/ui` primitive (button/badge/accordion/dropdown-menu/drawer/textarea/otp-input/switch itd.). Razlog: javne stranice i shared UI i dalje renderuju sirove paleta-klase (javni portal je out-of-scope za admin fazu), pa patch pravila ostaju LOAD-BEARING — brisanje bi regresiralo Aurum kontrast bez ijednog testa koji bi to uhvatio. Brisanje dolazi u obzir tek nakon tokenizacije javnog portala ili shared UI sloja.
- Finalni cilj admina postignut: sirovi `slate-*` u admin TSX ≈ 0 (ostale su samo javne izuzeci + dekoracija); `<Button>`/`DataTable`/`Select`/`Input` adopcija uvedena lokalno po stranicama (C (7/)–(15/)); meh. brisanje mrtvosti patch selektora (D (1/)–(2/)) — bez gubitka funkcionalnosti.
- Grana: `arena/dadb4053-beauty-salon-v2` = origin na HEAD-u; CI za svaki push (5/5 zeleno na finalnim batch-evima; praćeni limiti: `44277411543`, `44279398623` (cancelled→pokriven), `44280149703`, `44293613855`, `44295902829`).
- Remaining per plan before any „gotovo“ on broader scope: tokenizacija javnog portala + shared UI; **ručni vizuelni pregled** reservacijskog/auth/onboarding flow-a; zatim brisanje javnog Aurum patch CSS-a (Faza D finale).

### Faza C (16/) — standardizacija dijeljenih komponenti (`src/components/**`) `2e3d401`
- Owner: „share komponente sve standardizujemo bukvalno ipak“. Sve paleta-klase u dijeljenim komponentama prevedene na semantičke tokene (Classic i Aurum jednako):
  - `components/ui/`: accordion, avatar, badge, button, drawer, dropdown-menu, otp-input, separator, switch, tabs, textarea. Površine `bg-white`/`dark:bg-slate-950` → `bg-surface`, `slate-100` → `surface-muted` / `bg-line` (separatori), `border-slate-*` → `border-line`, svjetli tekst 900/950 → `text-content`, 600–800 → `content-strong`, placeholder → `content-muted`.
  - `components/`: ProtectedRoute/PublicOnlyRoute/StylistRoute (loading → `bg-surface-sunken` + `text-content-strong`), OnboardingShell (h1 → `text-content`, ostalo `content-strong`/`surface-*`/`border-line`), BeforeAfterSlider (`bg-surface-muted`, `focus-visible:ring-focus-ring`, knob ring `ring-line`).
- Zadržano namjerno, s razlogom: `app-logo.tsx` (brand mark), BeforeAfterSlider knob tekst (konstantna bijela podloga — ne smije se invertirati u tamnom modu), `button.tsx` hero/red varijante (konstantne podloge), status-semantičke rose/amber/emerald klase u `alert`/`badge`/`select`/`button(red)` (design-system status API).
- Testovi ažurirani: `onboarding-email-accessibility` (h1 → `text-content`), `text-contrast-allowlist` ratcheti (scanned 313→293, bg+text parovi 40→34, skippedDark 50→45; komentari s datumom).
- Lokalno: build PASS (291.3 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist.

### Faza D (4/) — finalni D: mrtav admin-scoped patch CSS nakon C (16/) `b265fe8`
- Owner: „možeš krenuti u finalni fazu D“. Poslije standardizacije komponenti, ponovni audit 341 `[data-skin="aurum"]` pravila (komentari uklonjeni iz selektora; admin-scope u 255-fajlova import closure; globalno pravila u runtime src):
  - 6 cijelih pravila obrisano: `[data-stylist-shell] [class~="dark:bg-slate-950"]`, `.admin-shell [data-analytics-hub] :is(.text-slate-600, .text-slate-700, .text-slate-900)`, `.admin-shell [data-analytics-hub] .border-slate-200`, `[data-users-dialog] .text-slate-500`, `[data-client-analytics-dialog] div[class~="bg-slate-50"]`, `[data-aurum-overlay-surface] :is(input, textarea, select)[class~="dark:bg-slate-950"]`;
  - alternative obrisane: `.text-slate-600` (`[data-admin-users]`, users-dialog, client-analytics-dialog), `.text-slate-500` (analytics-hub — preostala grana); jednostavnije selektor-liste umjesto `:is()` grupa gdje je ostala jedna grana;
  - audit artefakti (comment contamination, pogrešna cwd relativizacija) identifikovani i ispravljeni prije brisanja; provjera tokena u closure-u rađena je nad komentarima uklonjenim tekstom fajlova.
- **Javni Aurum patch CSS ostaje LIVE i netaknut** — javne stranice i dalje koriste sirove `slate-*` klase; brisanje je bezbjedno tek nakon tokenizacije javnog/auth/onboarding portala. Zadržane su i vendor/Radix klase (`.rbc-*`, `.recharts-*`, `[data-highlighted]`) i sve globalne [data-aurum-page] grane.
- Lokalno: build PASS (291.3 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist. CI se prati.

**Admin/C/D replans: završeno u mjeri u kojoj to dozvoljava javni portal. Dalji rad = tokenizacija javnog portala (novi batch serija).**

### Faza C (17/) — javni shell/blog/client-reservations/toast tokenizacija (javni opseg potvrđen) `f24f885`
- Owner: „Može nastavi dalje“ → kroz ask_user potvrđeno da se tretira kao zeleno svjetlo za **javni opseg** tokenizacije.
- Tokenizovano (Classic i Aurum jednako; bez novih animacija, bez izmišljenih vrijednosti):
  - `features/shell/public/public-layout.tsx` (loading/maintenance/header/nav/sidebar-footer/footer/socials), `public-ui.ts` (publicPage.outer/publicSection.surface → `bg-surface`, `subtle`), `before-after-spotlight.tsx`, `features/blog/public-blog-comments.tsx`, `features/client-reservations/{my-reservation-card, payment-summary-block}.tsx`, `src/lib/toast/toaster.tsx` (spreman za dark-toast estetiku preko tokena).
- Zadržano namjerno: komponente rezervisane za javne stranice (Public*.tsx) i auth/onboarding flow — sledeći batch (C 18/+); sirovi slate u testovima koji dohvaćaju javne stranice ostaje do tokenizacije tih stranica.
- Testovi: `text-contrast-allowlist` ratcheti (scanned ≥278, bg+text parovi ≥33) i `public-a11y-axe-findings` (skip-link test sada traži `bg-surface`).
- Lokalno: build PASS (291.2 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist. Datum mjerenja: 2026-11-18. CI se prati.

### Faza C (18/) — javni portal i auth/onboarding tokenizacija `75e6927`
- Owner (kroz ask_user): „Može nastavi dalje“ tretirano kao potvrda **javnog opsega**.
- Tokenizirano (Classic i Aurum jednako): `pages/public/*` (PublicHome, PublicReserve, PublicReservationView, PublicBlogList/Post, PublicContact, PublicGallery, PublicServiceDetail, PublicServices, PublicSatisfiedClients, MyReservations, MyReservationDetail, CampaignUnsubscribe), auth/onboarding (`Login`, `Register`, `NotFound`, `ResetPassword`, `ForceChangePassword`, `OnboardingGender`, `OnboardingEmail`) — oko 210 sirovih slate/zinc/gray/white/black paleta-klasa prevedeno na `surface*`/`content*`/`line`/`surface-inverse`/`on-surface-inverse` tokene; placeholder mape, Search ikonice, kalendar, `data-reserve-*` selektori.
- Zadržano namjerno: dekorativne prazne zvijezdice (ClientAnalytics `slate-200`, Reviews `slate-300`), app-logo/button(hero/red) konstantne podloge, BeforeAfterSlider knob/white overlay, `Gallery` hover overlay `bg-white/10` (tamni thumbnails), PublicServices/PublicServiceDetail tekstualni hel bojeni crtež (`#49332d`/`#e6dcd3`/`#fcfaf7` — topli editorial dizajn; NE paleta-klase), konstantni crni hero/overlay gradienti.
- `bg-white` → `bg-surface` globalno u scope-u (C (16/)–(18/) isti obrazac); placeholder mapa → `bg-surface-muted`.
- Testovi aktualizirani: `text-contrast-allowlist` ratcheti (scanned ≥125, bg+text parovi ≥24, allowlista 29→17 — stale javni unosi obrisani), `public-a11y-axe-findings` (mapTitle kontejner sada traži `bg-surface-muted` + `text-content-strong`, doesNotMatch `text-content-muted`), `public-contact/public-home/login/registration/onboarding-email/gender/service-detail-recovery` accessibility testovi — slate→token.
- **Javni Aurum patch CSS ostaje LIVE** — brisanje (Faza D finale) ide tek nakon kompletiranja javne faze s navedenim verifikationima; ovaj batch ne briše ništa iz `globals.css`.
- Lokalno: build PASS (291.0 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist. Datum mjerenja: 2026-11-18. CI se prati.

### Faza C (18.1/) — AAA hotfix poslije C (18/): javni linkovi ispod 7:1 u Aurum svijetlom
- CI 44317621050 (Rendered a11y) pao na `color-contrast-enhanced` (job je odmah dijagnosticiran preko check-run annotacija; log sa blob storea nije dostižan): 5 čvorova na kućnoj stranici (Aurum light) — footer `©` (`.py-4`, 6.18), kicker `.tracking-wide` (5.93), before-after comparison labels (6.38), featured review meta + date (6.38). Svi `text-content-muted` (#6b5d49) — Aurum svijetli `--text-muted` ne dostiže AAA 7:1.
- Popravka (AAA-strength copy obrazac): tih 5 čvorova (+ 6 kao backstop: before-after empty/select-transformation, `home-discover` kicker) → `text-content-strong`. Decoration watermark `text-content-muted/[0.22]` ostaje (22% prozirnosti, aria-hidden).
- Napomena za vlasnika: admin 1.4.6 čvorovi (blog th, daily-log values, 47 ukupno) su isti uzrok (`--text-muted` 6.18–6.38 u Aurum light) — to su warning-level zapisi postojeći i prije Faze C; odluke o dizajnu tokena jesu vlasničke, pa NE menjam `--text-muted` bez tvoje potvrde.
- Lokalno: build PASS (291.0 KiB / 300). CI se ponovo prati.

### Faza D (5/) — brisanje javnog Aurum patch CSS-a (proceduralno umrlo poslije C (18/)) — čeka CI
- Owner: „Izgled potvrđen. Možeš nastaviti dalje na sljedeći korak (Faza D 5/)“.
- Mimik provere (runtime src, substring za `[class*=]`, token-granice za `[class~]`, scope po selektoru): **22 delete operacije** u `globals.css` (~4.5 KiB uklonjeno); konstantne podloge (app-logo, Button hero/red — bez runtime korisnika), dekorativne prazne zvijezdice, status-AMBER grane S3 pravila i konstantni crni hero/overlayi **namjerno netaknuti i prozvani**.
  - S3 blok: `text-slate-9/8/7`, `text-slate-6/5`, `bg-slate-`, `border-slate-` pravila — obrisana (markup više nigdje ne nosi te klase); `text-amber-`/`bg-amber-`/`border-amber-` alternative ZADRŽANE (appearance odluka za vlasnika — vidi dole).
  - Hero/`data-home-hero-content`: `[data-aurum-hero]` ostaje samo `.text-white`; `.text-slate-200` alternative obrisane (2 pravila).
  - Homepage AAA audit blok: `.text-slate-600` alternative (about/review/cta) i `footer .text-slate-500` obrisane — pojačanje prelazi na `text-content-strong` čvorove iz C (18.1/). `home-discover .text-content-muted` i `home-about .text-brand-gold-text` ostaju.
  - `data-home-transformations` ostaje samo `a` grana; `[data-home-review] .text-slate-500` obrisana; footer `[class~=text-slate-600]` obrisana; header `hover:bg-slate-100` obrisana.
  - S4: `:is(button,a[href])[class*=bg-slate-900]`, `[data-aurum-progress] [class*=bg-slate-900/200]`, `[role=dialog] [class*=bg/border/text-slate-*]`, auth-banner `text-slate-2`, onboarding progress `bg-slate-2` — obrisane.
  - Reserve i blog-post article-actions slate grane, `data-aurum-comment .text-slate-500`, `data-blog-card-content :is(...)`, contact/satisfied-clients `:is(.text-slate-500, .text-slate-600)` obrisane; `data-users-dialog` slate grane uklonjene iz `:is()` liste (amber/rose/ok grane ostaju žive); `[data-admin-users] .text-slate-900` obrisana.
  - `BeforeAfterSlider` chevron `text-slate-700` → `text-content-strong` (konstantni svetli knob; zatvara posljednji runtime pogodak slate u [data-aurum-page]-opsegu).
  - Stale komentari rewordovani; fajl više **nema slate selektore** (ostala su 4 komentara koja historijski objašnjavaju tokene + translateY lažni pogodci).
- Lokalno: build PASS (290.6 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist.
- **OTVORENO ZA VLASNIKA:** status-AMBER grane S3 sweep-a (`text/bg/border-amber-` → Aurum ih renderuje kao `--text-muted`/`--surface-sunken`/`--line`) — design odluka: zadržati sirov status amber u Aurumu (preporučeno; semantik boja je svrha status API-ja) ili ravnati po dosljednosti s flavonom. Bez tvoje potvrde ne diram.
- CI za C (18.1/) (`44321148869`): 4/5 poslova prošlo; a11y posao crven isključivo na AAA čvoru `.text-content-muted.text-xs` u `/rezervacija` (light search stanje, 6.38:1 < 7:1 — isti `--text-muted` razlog kao C (18.1/); annotation `BOOKING_light_*_search`). Popravljeno u ovom batchu: `PublicReserve.tsx` `text-xs text-content-muted` -> `text-content-strong` (9 čvorova; isti obrazac poznat i u peer grupama my-reservation-card/payment-summary-block koje CI nije dohvatio jer nisu u istom stanju).

- Hotfix #2 (isti batch, na temelju CI `44323942493` na `a8ef27c`): search stanja sad clean (`text-content-strong` za `text-xs`), nove AAA 1.4.6 tačke u `dates` stanju — weekday zaglavlja kalendara `.uppercase.py-1` (12px, #6b5d49 na #ffffff = 6.38:1) i rezervni `text-sm` čvorovi isti razlog. Preostali `text-content-muted` u javnoj rezervacijskoj stranici smanjenih na 3 `aria-hidden` dekorativne ikonice (nisu tekst, ne podležu 1.4.6). CI `44323942493` je superseadovan — finalna verifikacija ide na ovom head-u.

- Hotfix #3 (na osnovu CI `44330264164` na `b6abe23` — prvi put čitljiva anotacija!): padovi `BLOG_POST_light_*_comments-populated` (`.text-content-muted.text-sm`, 14px, 6.38:1), `BLOG_LIST_light_*` (`[data-blog-card-content] .text-content-muted.mb-3.gap-2`, 14px, 6.38:1), `CONTACT_light_*_hours-error` (`.h3` 12px uppercase, 6.38:1) — sve light Aurum na bijeloj, isti `--text-muted` razlog. Prebačeno na `text-content-strong`: blog comments (hint/empty/date), blog list (date row/noData), contact (5× h3 sekcije). Dekorativne `aria-hidden` ikonice ostaju muted. Test `public-contact-accessibility` ažuriran (očekuje novi token). Ostali javno-scope AAA setovi (home/services/detail/gallery/reserve/satisfied-clients) — clean na CI `44330264164` razini: sve do blog posta je zeleno.
- CI workflow: `ci.yml` failure annotacija sada ispisje ✘ redove + NEPRAZNE violations liste (`"violations":[]` se ne matcha), uz `tail -n 40` (bez šuma koji je odsjekao baš redak s greškom u `44325979327`/`44330264164`).

### FAZA D (5/) — CI ZELEN na `8ca83be` (run `44332455709`, a11y job `134900190529`) 2026-11-18
- Oba hotfix poraženja (#1: `PublicReserve` `.text-xs text-content-muted` → strong; #2: calendar weekday `.uppercase.py-1` + noResults/`text-sm` → strong; međukorak #3: blog post `.text-content-muted.text-sm` \& comments hint/empty/date, blog list date row/noData, contact 5× h3 12px uppercase → `text-content-strong`) — sve light Aurum na #ffffff, 6.38:1 < 7:1 (AAA), isti `--text-muted` razlog. Vizualni efekat: isti tekst, samo tamniji.
- `public-contact-accessibility.test.mjs` ažuriran (h3 očekuje `text-content-strong`).
- CI: `ci.yml` failure annotation sada ispisje ✘ + neprazne violations liste (`"violations":[]` se ne matcha) + `tail -n 40` (prije: `head -160` s `spec.ts:N` šablonom matchirao SVAKI red — odsjekao je baš redak s greškom u `44325979327`/`44330264164`; dijagnostika je sada `✘ 70/71/74/75`-jasna).
- REZULTATI OVOG PASEA — `git diff c5267fa..HEAD`:
  - `.github/workflows/ci.yml` — a11y dijagnostika (CI infra, ne app kod)
  - `frontend/src/styles/globals.css` — obrisani svi preostali javni Aurum patch selektori (~121 linija): S3 slate grane (`text-slate-9/8/7/6/5`, `bg-slate`, `border-slate`), S4 `[class*=bg-slate-900] [data-aurum-progress] .bg-slate-900/200`, `[role=dialog] slate` ×3, hero `.text-slate-200` ×2, onboarding `bg-slate-2`, auth-banner `text-slate-2`, homepage AAA `.text-slate-600`/footer `.text-slate-500/600` `[class~]`, `home-transformations .text-slate-500/600`, `hover:bg-slate-100`, `reserve` + blog-post article-actions + aurum-comment + `data-blog-card-content` + contact/satisfied-clients slate grane, `[data-admin-users] .text-slate-900`, users-dialog slate grane (amber/rose/ok ostaju).
  - `BeforeAfterSlider.tsx` — chevron `text-slate-700` → `text-content-strong`.
  - `PublicReserve.tsx` — svih 12 sitnih `text-xs/sm text-content-muted` → `text-content-strong`; ostala samo 3 `aria-hidden` ikone.
  - `public-blog-comments.tsx` / `PublicBlogList.tsx` / `PublicContact.tsx` — sitan muted tekst → strong (AAA).
- OTVORENO ZA VLASNIKA PRIJE ZATVARANJA FAZE D (5/): (1) vizualna potvrda javnih stranica na Aurumu (posebno `/rezervacija`, `/blog`, `/blog/:slug`, `/kontakt` — tamniji sitan tekst); (2) status-AMBER grane S3 pravila: zadržati sirov status amber (preporuka: semantika boja je bit statusa) ili ravnati po Aurumu; (3) odluka o `--text-muted` tokenu (light 6.38:1 i dark 6.78:1 na surface-muted — oba ispod 7:1 za AAA) — pending, vlasnik odlučuje, ne dirati samostalno.


### Faza D (5/) — odluke vlasnika primijenjene (2026-11-18)
- **Vizualna potvrda nakon Faze D (5/):** izgled Aurum javnih stranica POTVRĐEN od vlasnika.
- **Status-AMBER grane S3 pravila: ALIGN — zadržati** (amber grane ostaju ravne po Aurum tokenima: `text-amber-* → --text-muted`, `bg-amber-* → --surface-sunken`, `border-amber-* → --line`); amber kao status semantik se NE renderuje sirovo u Aurumu. Bez izmjena u kodu — postojeće mapiranje ostaje.
- **Aurum light `--text-muted`: darkenan na AAA (7:1)** — vlasnik: „darken light --text-muted u AAA“.
  - Anketno mjerenje (HSL 35.294°/18.889% konstantno, samo L): L=27.0% → vs white **9.06**, vs surface-sunken **8.41**, vs surface-muted **7.31** — AAA na SVIM Aurum light podlogama (ranije L=35.294% → 6.39/5.93/5.15).
  - `globals.css`: `--aurum-muted` `#6B5D49` → **`#524738`** (NEJRA §10); semantički `--muted-foreground` / `--text-muted` / `--neutral-fg` `35.294 18.889% 35.294%` → **`35.294 18.889% 27.000%`** (hs l izvedeno, ±1 kanal poklapanje s hexom — verifikovano lokalno).
  - `docs/design/NEJRA – beauty salon · Referentni dokument.html` — §10 `light.muted:'#6B5D49'` → `'#524738'` (SSOT sync test: PASS, 8/8).
  - Tamni Aurum `--text-muted` (#B7A98F / 6.78:1 na surface-muted) — **NE mijenjan** (vlasnik nije odobrio); ostaje kao poznata warning stavka.
  - `scripts/check_ui_contrast.py --strict`: **140/140 PASS** (aurum light text-muted/surface = 9.05, surface-muted = 7.30; NEJRA §10 muted/page = 8.41).
  - Referentni-prijedlog-v2/v3.html i aurum-novi-identitet-koncept.html zadržani kao istorijski koncept (nisu §10 SSOT).
  - Očekivani efekat na a11y anotacije: light Aurum sitni `text-content-muted` tekst sada AAA — očekuje se smanjenje warning čvorova; finalni dokaz = CI a11y job.
- Build PASS (290.6 KiB / 300), 204× test:* 0 grešaka, SSOT 8/8.

### Faza D (5/) — ZATVORENO (2026-11-18): CI `44353945386` (`eb84cf8`) = ALL GREEN (5/5)
- a11y job: `violations 8` (prije 22) u 1.4.6 redu; sve born sas nokty efekat `--text-muted` darkening. Preostalih 8 warning čvorova: `/admin/settings` i `/stylist/*` — `.text-brand-rose-text` / `.bg-nav-active` — #7A5A12 na #EFE6D4 (5.13:1) — brand-on-brand-soft, van vlasnikove odluke (nije `--text-muted`); warning-level, NE blokira CI, držati kao poznatu stavku — gumbna odluka potrebna prije ikakvog mijenjanja brand tokena.
- NEJRA §10 i globals sinkroni (SSOT 8/8), `check_ui_contrast.py --strict` = 140/140 PASS, a11y job `10m27s` — kompletan rendered proof.
- Otkriveno i poboljšano u toku: `ci.yml` failure-annotation je maskirao failing test (head/spec.ts pattern matchirao svaki red; ~4133 B truncation) — sad ispisje ✘ + neprazne violations liste + tail -n 40; dokazno dijagnostički pomak u `44330264164` (imenovani failing testovi: blog-post 70/71, blog-list 74/75, contact h3).
- Master state: commit-ova ove faze — `b5b8e97` (Faza D 5/ deletion), `a8ef27c` (CHANGELOG ispr.), `01ce8ce` (hotfix #2 rezervacija weekday+text-sm; #1 `b5b8e97` uključuje search), `8ca83be` (hotfix #3 blog/kontakt + CI dijagnostika), `eb84cf8` (--text-muted AAA + SSOT), + ovaj (zatvaranje).
- OTVORENO (vlasnik, van CI-kritičnog): dark Aurum `--text-muted` (6.78:1 na surface-muted) — NE odobreno, ostaje; 8× brand-on-nav-active 1.4.6 (5.13:1) — novi known-issue; `features/**` bg-white opseg; Button strukturna adopcija (~50 repo-wide); administrativna 1.4.3 incomplete 15; 2.5.3 incomplete 22; orphaned komentar-analityka na kraju globals.css (zadržati kao dokumentaciju), NE dodirivati bez posebnog batch-a.
- Javni vizualni check: vlasnik potvrdio prije token darkening-a; nakon darkening-a sitni muted tekst je tek neznatno tamniji — vlasnički recheck preporučen ali nije preduvjet za CI; Faza D (5/) se smatra zatvorenom s ovim pushom.

### Faza E (1/) — Admin patch-CSS audit i čišćenje (globals.css, batch 1)
- Owner scope: „patch_audit“ — ista disciplina kao Faza D (5/), primijenjena na admin grane (`.admin-shell`, `[data-admin-*]`, `[data-analytics-hub]`, `[data-users-dialog]`, `[data-dashboard-*]`, `[data-aurum-calendar]`). Audit urađen sel. po sel. (svi 30 admin-relevantnih attribute selektora + sve ko-okkurencije s hook klasama).
- Mapa (admin regioni): S6 shell L991–1058; admin page-header L1142–1151; dashboard shortcuts/cards/states L1689–1735; recent-table th L1737–1740; admin nav/header L1741–1759; default card surface/border L1761–1768; admin primitives L1769–1792 (tabs, field, role-chip); badge pairs + users-dialog/override L1793–1848; analytics hub + client analytics dialog L1849–1896.
- **Proof-delete / proof-simplify (7 operacija u 6 pravila):**
  - obrisano `[data-users-dialog] [class~="text-amber-700"] { color: --warn-fg }` — mrtvo: later (L1842-countdown block) `:is(.text-ok-foreground, .text-amber-700, …) { color: --text }` istog escopa i iste specifičnosti (0,3,0) pregazi — Users.tsx amber čvorovi (1261, 1267, 1632 u dialogima) dobijaju `--text`, nikad `--warn-fg`.
  - obrisano `[data-users-dialog] :is([class~="text-rose-600"], [class~="text-rose-700"]) { color: --bad-fg }` — isti razlog (1282, 1349, 1410, 1541 čvorovi) — pregazeno istim `--text` resetom.
  - obrisano `[data-users-dialog] [class~="bg-rose-50"] { bad-bg/bad-fg/bad-fg }` — potpuno pregazeno kasnijim identičnim escopom `div-ne-ograničenim` reset blokom (`background: bad-bg; border-color: bad-fg; color: --text`, L1844 u prije-izmjenoj verziji) — sva tri prop. pregažena.
  - `[data-dashboard-outbox] :is(.text-content-muted, table.app-table th)` → `table.app-table th` — `.text-content-muted` ne postoji ni u jednoj dashboard/outbox datoteci (`outbox-diagnostics.tsx`, `outbox-events-table.tsx`, `Dashboard.tsx`, `finance-stats.tsx`, `ops-stats.tsx`) — `table.app-table th` ostaje (DataTable renderira `app-table`).
  - `[data-ui-badge="success|warning|danger"]` (users-scope par): izbačene dead `color: ok-fg/warn-fg/bad-fg` — users-scope reset `:is([data-admin-users], [data-users-dialog]) [data-ui-badge] { color: --text }` (kasnije, iste specifičnosti) ih pregazi; `bg/border` ostaju palette-backed (semantik status, AAA bg na surface).
- **ZADRŽANO (sve live):** `data-admin-state` loading/empty/error + `data-admin-skeleton-cell` (data-state.tsx — jedini proizvođač), `data-dashboard-outbox` th, `data-dashboard-replay-confirm` (+ hover; `[data-mode]` varijanta je nivo na root podešavanju), `[data-analytics-hub] .grid > [data-default-card-surface] { min-width: 0 }` i `.recharts-responsive-container { min-width: 0; max-width: 100% }` (layout-only, bez skin scope-a — nužni zbog recharts measuring-node ponašanja), recharts container rules, `table.data-table` 320px reflow blok, `[data-client-analytics-dialog]` (portal van hub escopa), `[data-admin-tabs-list]`/`[data-admin-tab]`/`[data-default-admin-field]` (default fields u portal dialogima — ne ulaze u `.admin-shell`), `data-users-role-chip` (admin-users + amber grana), sve `[data-aurum-calendar]` (ReservationsCalendar), `[data-aurum-nav-icon]` (admin-nav-menu, StylistLayout).
- Nav/portal nalaz: nijedan `[data-aurum-page]` selektor nije u admin opsegu (Aurum-page je isključivo javni + profile/onboarding scope) — admin audit ga nije dirao.
- Namjerne ne-primjene: `.admin-shell [data-default-admin-field]` vs identična `[data-users-dialog]` varijanta NE spajati — dialog portali idu van `.admin-shell`. Analytics hub text overrides (`text-content-muted`/`text-rose-*`/`text-emerald-700`…) živi (AnalyticsHub.tsx). Users.tsx teal/blue svg akcije (922/932) → `--text` (živo), rose Trash2 (943) → `--bad-fg` (živo).
- Lokalno: build PASS (290.6 KiB / 300, bez promjene budgeta), diff-check PASS, contrast strict 140/140 PASS.
- Gatesi prije commita: full `test:*` sweep (204/204 paketa PASS), build PASS (290.6 KiB / 300), diff-check PASS, contrast strict 140/140 PASS.

### Faza E (1/) — ZATVORENO (2026-11-18): CI `44382663785` (`c9bbe0f`) = ALL GREEN (5/5)
- Jobs: Rendered a11y (axe) na izolovanoj CI bazi ✓, Repository hygiene and static reports ✓, Mobile TypeScript ✓, Backend build and tests ✓, Frontend typecheck and production build ✓. (`gh run view --json conclusion,jobs` verifikovano — exit-status watch ne maskira, ali se status uvijek potvrđuje ovim pogledom.)
- Owner visual check (preview na :5173): **OK — sve izgleda isto** (admin badges/dijalozi `/admin/users`, dashboard `/admin`, analitika) — bez regresija nakon delete/simplify operacija.
- Neto: globals.css −9/+4 linija; uklonjena su isključivo cascade-shadow pravila i mrtvi selector arm; ponašanje Aurum admina nepromijenjeno (dokazni mimik proof polazi od Users.tsx/outbox/DataTable runtime co-occurrence).
- Napomena za naredne batcheve Faze E: preostalih ~180 admin linija patcha je ZIVA (svaki selektor ima runtime korisnika); dalje „uprošćivanje“ mora ići kroz refactor markupa (npr. portal dialog ↔ `.admin-shell` uvek scaped override), ne touring-shadow brisanjem. Otvorene stavke (1.4.6 8×, 1.4.3 incomplete 15, 2.5.3 incomplete 22, dark `--text-muted`, `features/** bg-white`, Button adopcija) ostaju netahnute.

### Faza E (2/) — Admin/CTA grane verifikacija: dead S2 gold CTA pravilo obrisano (2026-11-18)
- Nastavak Faze E po odobrenom scope-u („verifikacija preostalih grana — users-dialog, analytics hub, CTA rules“).
- CTA audit: svi `data-aurum-cta="primary"` korisnici (13 čvorova u 13 fajlova) su `<Button>` — normalni (`<button>`) ili `asChild` (`<Link>` → `<a href>`); svi žive unutar `[data-aurum-page]`-escopa (autentikacija/onboarding/javne stranice; OnboardingShell nosi `data-aurum-page="onboarding"` pa i onboarding CTA-evi potpadaju).
- **Proof-delete:** baza S2 `[data-skin="aurum"] [data-aurum-cta="primary"]` obrisana — 100% shaded od `[data-aurum-page] :is(button, a[href])[data-aurum-cta="primary"]` (iste deklaracije, veća specifičnost 0,3,1 vs 0,2,0, kasnije u fajlu). Komentar uz zlatno pravilo rewordovan (sada je jedini izvor deklaracija).
- **ZADRŽANO (živo):** `data-aurum-cta="secondary"` (transparent + gold border + hero-text; PublicHome onDarkOutline + px-8, 2 čvora), `[data-aurum-auth-page] [data-aurum-cta="primary"]` (min-height + focus-visible outline + forced-colors Highlight grana), `[aria-pressed="true"]` (odabran dan + primary Button pressed state — zaseban blok iznad), `data-home-cta` (border-top trokomponentni blok + surface-sunken), `[data-home-cta]` komentar u § home-cta sekciji, `data-aurum-cta` fokus outline na authskim stranicama.
- Verified before delete: svaki CTA čvor renderuje `button` ili `a[href]` (link: PublicHome 188, MyReservations 175, PublicReservationView 242; submit-buttoni: Login/Register/ResetPassword/NotFound/CampaignUnsubscribe/PublicContact/PublicReserve/Onboarding*/ForceChangePassword).
- Neto: −7/+3 linija; ponašanje Aurum CTA dugmadi nepromijenjeno (iste deklaracije vode, samo kroz jedan izvor).
- Lokalno gates: build PASS (290.5 KiB / 300), diff-check PASS, 204× `test:*` = 0 grešaka.
- Gates prije commita: 204× `test:*` = 0 grešaka, diff-check PASS, CI `44392890535` (`bbd74b4`) = **ALL GREEN (5/5)**.
- Vlasnički visual check: **OK** (zlatna CTA dugmad nepromijenjena).

### Faza E (2/) — ZATVORENO (2026-11-18)
- Gold CTA: jedan izvor deklaracija (`[data-aurum-page] [data-aurum-cta="primary"]` re-assert), dead S2 baza obrisana; secondary / auth / home-cta / pressed-state grane zadržane i dokazane žive.
- Napomena: daljnja CTA evolucija (npr. Button strukturna adopcija, varijanta reconciliation) ostaje van ovog audit-scope-a — zaseban vlasnički batch.

### Faza E (3/) — WCAG 2.5.3 label-content-name-mismatch: 22 incomplete čvorova → korak-raizrok fix (2026-11-18)
- Owner scope: Faza E (3/) (odabrano iz ponude nakon Faze E (2/) zatvaranja). Cilj: otkloniti 22 „incomplete“ čvora koje axe prijavljuje na admin rutama (`/admin/analytics #radix-:rm:`, `/admin/blog|daily-log|finance|gallery|loyalty|… #radix-:rg:/:rm:` — 11 admin ruta × 2 dugmeta: mobilni trigger + DropdownMenuTrigger), vidljivi uzroci iz CI anotacije runa `44472018787`.
- **Uzrok (iz axe-core source, axe 4.14.0):** `label-content-name-mismatch-evaluate` računa `visibleText = visibleVirtual(…)`; ako je `is_human_interpretable(visibleText) < 1` → `return void 0` (= incomplete „Unable to determine…“). `isHumanInterpretable` vraća 0 kad je `str.length === 1 && /\D/` (`isNonDigitCharacter`), kad je tekst 'aa'/'abc' (`isSymbolicText`) ili samo punctuacija/emoji. Admin AvatarFallback je prikazivao **jedini znak iz username-a** (`user?.username?.trim()?.[0].toUpperCase()` — u CI `ci_a11y_admin` → „C“), pa je svako admin dugme menija INHERENTNO bilo „Unable to determine“ — bez obzira na aria-label (`Admin meni, C`). Stylist i public imaju 2-znakovni whitespace-split inicijal (za „živu“ provjeru 2.5.3), pa su uglavnom bili „passed“.
- **Fix:** novi dijeljeni helper `src/utils/user-initials.mjs` (`userInitials(username, fallback)`) — UVIJEK 2 alfanumerička znaka: split po svemu što nije L/N (`/[^\p{L}\p{N}]+/u`), uzmi prvi znak dvije neprazne grupe; jedna grupa → njena prva 2 alfanumerička znaka; degenerisano → fallback (pad 'A'); uppercase. `.d.mts` + `.test.mjs` prati label-in-name obrazac (uz `test:user-initials` u paketu — 6/6 PASS). Sva tri mjesta (admin-layout, StylistLayout, public-layout) sada zovu JEDAN izvor; `|| 'S'` / `|| 'U'` mrtve grane uklonjene.
  - CI e2e korisnici (`ci_a11y_admin`, `ci_a11y_stylist`) → inicijali `CA` — interpretable („ca“), a accName „Admin meni, CA“ (labelWithVisibleText ne dira ime jer već sadrži vidljivi tekst) → očekuje se 0 incomplete čvorova za 2.5.3 u CI.
  - Registracija testova: `wcag-source-contracts.test.mjs` — ažurirane 2.5.3 grane ugovora (novi `userInitials` helper + novi contract koji zabranjuje 1-char fallback na sva tri mjesta) — 17/17 PASS.
- **ZADRŽANO:** label-in-name mehanizam (`label-in-name.mjs`) — nepromijenjen; WCAG 2.5.3 je i dalje odlučivo (accName ⊇ vidljivi tekst).
- Gates prije commita: build PASS (290.7 KiB / 300), diff-check PASS, kontrast 140/140 PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Commit `0e5137d` (fix) + `69c2269` (CI hygiene: `test:user-initials` dodat u ci.yml — `check_ci_index.py` PASS; prvotni run `44476000167` pao SAMO na hygiene poslu, ostalih 4 zeleno — poznata posljedica novog `test:*` bez CI koraka, sada otklonjeno).
- **CI `44476078583` (`69c2269`) = ALL GREEN (5/5). a11y annotacije: `2.5.3 label-content-name-mismatch: PROLAZ (passed 32, incomplete 0)`** (prije: 10 passed / 22 incomplete). Bonus: `1.4.3 color-contrast: NEPOTPUNO (incomplete 7)` (prije 15) — dio nestalih je isti uzrok (inicijali čvorovi).
- Vlasnički visual check: **OK** (avatar inicijali 2-znakovni).

### Faza E (3/) — ZATVORENO (2026-11-18)
- 2.5.3 incomplete → 0. Dijeljeni `userInitials` helper (`src/utils/user-initials.mjs`, 6/6 unit), sva tri omotača konsolidovana na jedan izvor; `wcag-source-contracts` 17/17.

### Faza E (4/) — WCAG 1.4.3 incomplete (7): dokazivanje human-judgment zaključka (2026-11-18)
- Odluka vlasnika: E (4/) istraživanje incomplete čvorova. Bez izmjena koda — ispostavilo se da je **svih 7 čvorova axe determination-blok, a ne defekt**; kompenzacije već u kodu i CI-ju su dovoljne; vlasnik je vizualno potvrdio.
- **Dokazi iz trenutnog stanja (CI `44477995617`) i iz source-a:**
  - `/admin/analytics` `.recharts-legend-item-text` ×3 (legend-item-0/1/2) — axe: „Element's background color could not be determined **because element contains an image node**“ (Recharts ikona serije je SVG susjed teksta). Recharts `<Legend labelStyle={{ color: 'hsl(var(--text))' }} />` (Analytics.tsx:357) — tekst je Token-backed (`--text` AAA na kartici); kontrast mjeri `inlineColorContrastViolations` probe u CI (a11y-admin.spec.ts + stylist-stylist + wcag-rendered) → 0 fail. Napomena uzrun `43000853379`: iza incomplete se KADA skrivao stvarni prekršaj (serijski boje 3.25/4.13/2.39:1) — otklonjeno (tekst sada `--text`).
  - `/blog` kicker `.tracking-wide` (Novosti i sav…, `text-content-strong` 12px uppercase) — „…due to **a background image**"; `/blog` h1 (title 30–36px) — isto; `/galerija` h1 — „…due to **a background gradient**".
    - Hero scene: blog/gallery vrh ima dekorativnu pozadinsku sliku na **opacity 0.08** + `pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white` (PublicBlogList.tsx L92, PublicGallery.tsx L133) — efectivno ≥85% bijela podloga pod tekst; kicker/h1 su `text-content-strong`/`text-content` — ≈9:1 / ≈14:1 na toj podlozi.
    - Dekorativne pozadine su `pointer-events-none` bez teksta — 1.4.5 inventory (zauzeto kroz anotacije) ih vodi kao „TRAŽI LJUDSKU PROCJENU“; vlasnik je vizualno potvrdio kontrast na sva 3 h/kicker čvora (+ analitičku legendu).
- **Anotacija-semantika** (potvrđeno čitanjem `e2e/axe-coverage.mjs`): anotacija „axe nepotpuni cvorovi po pravilu“ akumulira **uzorke** (`MAX_INCOMPLETE_NODES_PER_RULE = 3`/rute), otuda „15 nepotpunih čvorova“ za 1.4.3 dok pokrivenost-brojka glasi **7**; 2.5.3 anotacija je nakon E (3/) ZERO (nije se pojavila). Annotacija je INFORMATIVNA (warning-level), CI je oduvijek zelen s njom.
- **Zaključak:** 1.4.3 incomplete 7 = eloquent determination-blok; NE prekršaj; NE mijenjati kod zato; alarm ne dići. Ako ikad treba formalno na nulu — jedina održiva ruta je scrim → solid/`via-transparent` na bijelom (bijeli 95% je već gotovo-neka podloga) + `inlineColorContrastViolations` za objavljene h1/kicker; NE preporučuje se gaming axe-a.
- Vlasnički visual check: **OK** — /blog, /galerija hero tekstovi i /admin/analytics legenda čitljivi (preview :5173).
- Nema commit-ova osim ovog zatvaranja; nema novog koda.

### Faza E (4/) — ZATVORENO (2026-11-18)
- WCAG 1.4.3: 7 incomplete čvorova = human-judgment zaključen (bez izmjena). Faza E lanac sada: (1/) admin patch-CSS ✓, (2/) CTA ✓, (3/) 2.5.3 PROLAZ 32/0 ✓, (4/) 1.4.3 human-judgment ✓.
- Otvorene stavke ostaju po vlasničkim odlukama: 1.4.6 8× brand-on-nav-active; dark `--text-muted`; `features/** bg-white`; Button strukturna adopcija; orphan komentar-analitika na kraju globals.css.

### Faza E (5/) — WCAG 1.4.6 8× brand-on-nav-active: AAA brand-text (Aurum light) (2026-11-18)
- Odlukom vlasnika („A — Zatamni brand-text (7.73:1)"): Aurum light `--brand-primary-text(-light)` **#7A5A12 → #554308** (7.73:1 na #EFE6D4 — AAA 7:1; ranije 5.14:1, 1.4.6 enhanced kršeno na 8 čvorova, AA 4.5 je zadovoljeno).
  - Obuhvaća: `/admin/settings` aktivni tab „Sajt" + 5× `.bg-nav-active` anchor (`/stylist/debts|inbox|schedule|schedule/new|stats`) + `/admin/settings` ikonica u settings tab-nav/`.text-brand-rose-text` čvorove — **sve 8 1.4.6 annotacija je isti par**.
  - **NE dijeto:** sirovi `--brand-primary` #7A5A12 (Button/CTA/borderi), `--aurum-brand` #7A5A12 (NEJRA §10 — raw brand tokeni), `--brand-primary-ring`, classic `:root`/`.dark` (#632238/#E5B3C5 — 9.40/8.48 AAA već), Aurum dark (#D4AF6A — 7.57 AAA).
- **SSOT sync:** `theme-ssot-sync.test.mjs` — `brand-primary-text(-light)` izbačeni iz RAW_MAP (više se ne ravnaju na §10 brand by-design); nova dedicated asertacija: light block `#554308`/`#554308`, `brand-primary`/`aurum-brand` ostaju `#7A5A12`, dark ostaje `#D4AF6A` — **9/9 PASS**.
- **Contrast SSOT:** `check_ui_contrast.py` — parovi „brand-primary-text / surface" i „brand-primary-text / nav-active" podignuti na **AAA_TEXT_THRESHOLD (7.0)** (hard-enforced going forward). Rezultat strict runa: **140/140 PASS** — svi 4 stanja AAA (web light 9.39, web dark 8.47, aurum light 7.73, aurum dark 7.57).
- **Komentar** u `admin-nav-menu.tsx` (zastarjela tvrdnja „9.39:1 light" — bila je CLASSIC mjerenje) rewordovan preciznim vrijednostima po stanju.
- NEJRA §10 HTML **nemijenjan** (brand je 1 od 12 SSOT tokena; `#7A5A12` ostaje).
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, 140/140 contrast strict PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- Commit `e8a5ec2`. **CI `44482691344` (`e8a5ec2`) = ALL GREEN (5/5). a11y annotacije: `1.4.6 color-contrast-enhanced: PROLAZ (passed 32, incomplete 0, inapplicable 0, violations 0, absent 0)`** — prvi put **nula** 1.4.6 čvorova; 1.4.3 ostaje (7) determination-blok, jednako kao E (4/).
- Vlasnički visual check: **OK** (aktivni nav/tab — tamniji brand tekst, champagne čip; /admin, /stylist, /admin/settings).

### Faza E (5/) — ZATVORENO (2026-11-18)
- 1.4.6 AAA čvorovi → 0. Lanac Faze E sada zatvorena: (1/) admin patch-CSS ✓ · (2/) CTA ✓ · (3/) 2.5.3 PROLAZ 32/0 ✓ · (4/) 1.4.3 human-judgment ✓ · (5/) 1.4.6 PROLAZ 32/0 ✓.
- Napomena: dark Aurum `--text-muted` (6.78:1 na surface-muted) ostaje known-issue po vlasnikovoj odluci (još neodobreno); Button adopcija ~50, `features/** bg-white`, Button strukturni scope, orphan komentari — čekaju vlasničke odluke.

### Faza F (1/) — `features/** bg-white`: mapa + migracija 15 čvorova → `bg-surface` (dark Aurum defect) (2026-11-18)
- Owner-scope (odabrano poslije zatvaranja Faze E): prvo mapa/procjena obima (18 solid čvorova / 9 fajlova, sva u `features/`; 0 u ostatku `src/`), zatim vlasnička odluka „Da — migracija sad“.
- **Razlog (uzrok defekta):** `Input`/`Select`/`Textarea` base je `bg-surface`; proslijeđeni `bg-white` ga poništava (`cn`/tailwind-merge — kasniji utility pobjeđuje) → u Aurum **dark** ove površine ostaju bijele uz `text-content` (near-white) ⇒ gotovo nečitljiv tekst. U light stanjima ponašanje je vizuelno identično (`--surface` = #FFFFFF), zato nije primijećeno.
- **Migrirano (15):** `setting-editor-form.tsx` ×6 (textarea/select/number/url/text + mono color-hex input), `setting-group-panel.tsx` (panel), `settings-module-page.tsx` (search kartica + skeleton), `settings-tab-nav.tsx` (neaktivni tab), `blog-comments-dialog.tsx` (odobren komentar; neapproved grana ostaje amber + `dark:` varijante), `blog-post-form-dialog.tsx` (language Select), `workbook-new-entry-page.tsx` ×3 (2× listbox dropdown + odabrana-usluga row).
- **ZADRŽANO (3 deliberate-keep, komentar dodan uz svaki):** color-swatch backdrop (`setting-editor-form.tsx` — kontrast native color pickera), toggle knob (`workbook-reschedule-preview-page.tsx` — kontrast na aktiviranom/tamnom track-u), email preview okvir (`email-visual-editor.tsx` — mailovi se renderuju na bijelo, nezavisno od teme aplikacije).
- `bg-white/xx` opacity-varijante na imagery overlay-jima (BeforeAfterSlider, Gallery, PublicServices, `button.tsx` onDark/overlay-hero) — van scope-a, namjerno (scrims/badge na slikama).
- **Bonus nalaz (NE dirano, van scope-a):** `settings-module-page.tsx` — hardcoded `text-[#8a624e]` ikonice (search row + skeleton loader); kandidat za zaseban token batch.
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (admin settings + stylist workbook u light/dark Aurumu).

### Faza F (1/) — ZATVORENO (2026-11-18)
- `features/** bg-white`: 15 čvorova migrirano na `bg-surface` (dark Aurum defect otklonjen), 3 deliberate-keep komentirana, opacity-overlay-ji namjerno netaknuti.
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44486871989` (`98cf7c4`) = ALL GREEN (5/5). a11y: 429 passed / 0 failed; `1.4.6 enhanced: PROLAZ (32/0)`; `1.4.3` ostaje 7 incomplete (human-judgment, kao E (4/)); nema novih nalaza.**
- Vlasnički visual check: **OK** (admin settings + stylist workbook u light/dark Aurumu).
- Otvorene stavke (čekaju vlasničke odluke, ne pokretati samoinicijativno): dark Aurum `--text-muted`; Button adopcija; orphan komentari (globals.css tail); dark 1.4.6/1.4.3; 1.4.6 accent #9B3D4F; AnalyticsHub child proofs; CI Node 20→24; bonus nalaz iz F (1/) — hardcoded `text-[#8a624e]` ikonice u `settings-module-page.tsx`.

### Faza F (2/) — `settings-module-page.tsx` hardcoded `#8a624e` → `brand-rose-text` (2026-11-18)
- Vlasnik je iz mape hardcoded-hex nalaza (poslije F (1/)) odabrao minimalni scope: samo 2 čvora — `Settings2` (search row status) i `Loader2` (skeleton loader ikonice) u `settings-module-page.tsx`.
- `text-[#8a624e]` → `text-brand-rose-text` (`var(--brand-primary-text)`): classic light 9.39 / classic dark 8.47 / Aurum light 7.73 / Aurum dark 7.57 na površini — sve AAA; isti token kao postojeći brand-ikonica obrazac u fajlu (L103, `bg-nav-active` + `text-brand-rose-text`).
- `dark:` grana sada kroz token (prije: uvijek #8a624e, bez dark varijante).
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- **Zapis mape (NE dirano, čeka vlasničku odluku):** `PublicServices.tsx` 109 + `PublicServiceDetail.tsx` 38 hardcoded-hex čvorova (warm-paper paleta #49332d/#75645a/#e8ddd3…, `dark:` pokrivenosti 0) — javne stranice ne slijede Aurum temu; `email-visual-editor.tsx` 11 hex = white email preview (namjerno).
- Vlasnički visual check: u toku.

### Faza F (2/) — ZATVORENO (2026-11-18)
- `settings-module-page.tsx`: 2 ikonice `text-[#8a624e]` → `text-brand-rose-text` (token, AAA u sva 4 stanja).
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44496125943` (`903123c`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK**.
- Napomena: veći nalaz (`PublicServices.tsx` 109 + `PublicServiceDetail.tsx` 38 hardcoded-hex, 0 `dark:`) ostaje zabilježen u F (2/) logu — čeka vlasničku odluku (istraživanje / migracija / standstill).

### Faza F (3/) — PublicServices / PublicServiceDetail: hardcoded warm-paper paleta → semantički tokeni (2026-11-18)
- Vlasnik odabrao: migracija sad, **hex-patch blok u globals.css (L559–573) OSTAJE ovaj krug** (brisanje tek uz mimik dokaze u zasebnom krugu).
- **Scope:** `PublicServices.tsx` (~110 čvorova) + `PublicServiceDetail.tsx` (~38). Mapa: espressos `#49332d/#382a25/#352925/#2d1f1c/#4b3a35/#4b3830`→`text-content` odnosno `bg-/border-surface-inverse` (tamni čipovi) + `text-white`→`text-on-surface-inverse` (samo na čipovima; text-white na imagery scrim-ovima ZADRŽAN); taupe mutes → `text-content-strong`; bronze/plum akcenti → `text-brand-rose-text` (`#b79b87` separator → `text-content-muted`; `#80624f` kicker → brand); sve ivice → `border-line` (opacity/\"/25–/60\" plumbljeno na solid line — isto što patch i danas radi); hover ivice `#bea998/#b5937b`→`border-control-border`; sekcijski bg `#f4eee7`→`bg-surface-sunken`, `#fcfaf7/#fbf8f4/#f2e6de/#f3e8e0/#f1e3dc/#e8e9df/#eee4d7/#eee0e7/#f8f2ed/#efe7e0/#dfd1c2`→`bg-surface(-muted)`; `#b89b86`→`bg-line`; focus ring-ovi `#9d735d/#805b4c`→`ring-focus-ring`; `placeholder:text-[#75645a]`→`placeholder:text-content-muted`; `decoration-[#c5a88f]`→`decoration-line`; `divide-[#f0e9e2]`→`divide-line`; hex shadow-ovi `#6a4b3c/#574237/#49332d`/5–15 odbačeni (ostaju `shadow-sm/xl/lg`).
- **ZADRŽANO namjerno:** hero fallback gradijenti `from/via/to-[#c6aa96/#e6d8ca/#8e7060]` (imagery), `#241814` hero scrim, arbitrary rgba shadow-i, `text-[#554038]` na bijelom `bg-white/85` image badge-u (fiksno taman u svim temama — komentar u TSX-u).
- **Defekt otklonjen:** classic dark više nema light-paper ostrva — stranice sada prate temu (classic dark: slate tokeni; classic light: slate; Aurum ostaje champagne). Classic light vizuelno mijenja toplu paletu → slate (namjerno, theme fidelity; Aurum = default skin, tamo je vizuelna razlika zanemariva jer patch već ravna na iste tokene).
- **Poznato:** Aurum hex-patch (L559–573) sada bez ijednog TSX potrošača (provjereno grep-om) — brisanje u zasebnom krugu uz mimik dokaze; `text-content-muted` na `#b79b87` separatoru je malo blaži nego prije (dekorativno).
- Gates: build PASS (289.6 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (/usluge + detalj usluge u 4 stanja: aurum light/dark, classic light/dark).

### Faza F (3/) — ZATVORENO (2026-11-18)
- PublicServices/PublicServiceDetail: ~148 hardcoded hex čvorova → semantički tokeni; classic-dark light-ostrva otklonjena; Aurum patch zadržan (brisanje uz mimik dokaze).
- Gates: build PASS (289.6 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44508482933` (`7ec128e`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK** (/usluge + detalj usluge u 4 stanja).

### Faza F (4/) — Dark Aurum `--text-muted` → #BFAF96 (AAA 1.4.6) (2026-11-18)
- Vlasnik je iz odluke A odabrao minimalno brighteno: `#B7A98F` → **#BFAF96** (na surface-muted `#2A2217`: 6.78:1 → **7.31:1**; na surface `#1A1510`: 7.84 → 8.45; na page: 8.49 → 9.15). AA je oduvijek prolazio; AAA (7.0) nije na najtamnijoj tekstualnoj površini.
- **Mehanizam — kao i svijetla strana (#524738), NE kao brand-devijacija (E5):** NEJRA §10 SoT (`docs/design/NEJRA – beauty salon · Referentni dokument.html`, dark `muted`) ažuriran u isti #BFAF96 — SoT ostaje jedini izvor istine; `theme-ssot-sync.test.mjs` NE mijenjan (exact-match i dalje drži). `globals.css`: `--aurum-muted` + izvedene HSL trojke (`--muted-foreground`, `--text-muted`, `--neutral-fg` → `36.585 24.260% 66.863%`).
- **Contrast SSOT:** AAA pragovi za `text-muted/surface` i `text-muted/surface-muted` su dodani AURUM-ONLY (u `AURUM_EXTRA_PAIRS`) — klasični web (5.59/5.10 i 6.55/5.43 na AAA 7.0) namjerno ostaje na TEXT_THRESHOLD (AA). Prva verzija podigla pragove za sva 4 stanja → 4 FAIL-a u classic states, otklonjeno odmah. Strict run: **PASS — svih 144 para** (140 + 4 nova aurum-AAA).
- Napomena: ostali dokumenti u `docs/design/` (referentni-prijedlog-v2/v3, aurum-novi-identitet-koncept) nose istorijski #B7A98F — namjerno netaknuti (arhivski prijedlozi, nisu SoT koji čitaju gatesi).
- Gates: build PASS (289.7 KiB / 300), diff-check PASS, contrast strict **PASS (144/144)**, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (Aurum dark — muted tekstovi su ~7% svjetliji; nijedan drugi state se ne mijenja).

### Faza F (4/) — ZATVORENO (2026-11-18)
- Dark Aurum `--text-muted` #B7A98F → #BFAF96 (AAA na surface-muted/surface/page); NEJRA §10 SoT ažuriran kao light precedent; contrast SSOT: aurum-only AAA parovi (classic netaknut).
- Gates: build PASS (289.7 KiB / 300), diff-check PASS, contrast strict **PASS (144/144)**, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44512475492` (`cf7708e`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK** (Aurum dark; classic states nemijenjani).

### Faza F (5/) — Button variant reconciliation: `destructive` → `danger` (2026-11-18)
- Vlasnik odabrao opciju A (bez adopcije 50 raw `<button>` — svi su specijalizovani a11y/widget obrasci: segmented controls, listbox opcije, calendar ćelije, stretched-link kartice, disclosure/toggle switcheve, sort-header-i; nekoliko nosi eksplicitne komentare zašto raw `<button>` mora biti).
- **Reconciliation:** 5 preklapajućih upotreba Button `destructive` (hardcoded red-600/red-700) → `danger` (semantički `bg-danger` token; 5.22:1 light / 6.29:1 dark po contrast SSOT-u): `cancel-reservation-dialog.tsx`, `entry-delete-dialog.tsx`, `admin/ui/confirm-dialog.tsx` (isDestructive ternary), `aurum/ui/confirm-dialog.tsx` (isti), `Services.tsx` (deletionAction ternary). `destructive` varijanta obrisana iz `ui/button.tsx`.
- **ZADRŽANO:** `Alert variant="destructive"` (×3, rose-tint soft alert — vlastita komponenta/semantic), `Badge variant="danger"` (×3), svih 50 raw `<button>` widget čvorova, `--destructive` CSS tokeni (klasični shadcn sloj).
- **Opcionalna adopcija (B opcija, NIJE urađena):** BlogList retry/load-more ×3 (rounded-lg→pill), clear-search ikonice ×2 (ghost/icon, h-11→h-10) — ostaje za vlasnikovu odluku.
- Gates: build PASS (289.5 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (delete/cancel tok: /services brisanje usluge, dnevni log delete, cancel reservation; danger se sada renderuje semantičkim danger tokenom, nije red-600 — vizuelno vrlo slično).

### Faza F (5/) — ZATVORENO (2026-11-18)
- Button variant reconciliation: `destructive` → `danger` (5 pozivnih mjesta); `destructive` varijanta obrisana; 50 raw `<button>` widgeta dokumentovano zadržana.
- Gates: build PASS (289.5 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44515714897` (`a18cc8a`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK**.

### Faza F (6/) — Orphan komentari (globals.css tail): reword + dopuna (2026-11-18)
- Owner je odabrao minimalni scope (A) iz inventure tail bloka (L1841–1887, analytics):
  - L1854–55: odbačena zastarjela referenca na nepostojeći `index.css` (istorijski artefakt) — zadržan WHY (reflow nezavisan od grafa na 320px; scope na hub).
  - L1849: `[data-analytics-hub] .grid > [data-default-card-surface]` dobilo komentar (min-width:0 ↔ grid track, mirror Recharts zero-width mjerenje).
- Inventura je potvrdila: svi ostali komentari u tail bloku tačno prate aktivna pravila (Recharts zero-width, portal-scoped client-analytics-dialog, badge surface pairs, hub text-muted-strong pairs) — nikakva pravila bez komentara osim L1849, nikakvi komentari bez pravila.
- Bez izmjena ponašanja (comment/CSS-rule description only).
- Gates: build PASS (289.6 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.

### Faza F (6/) — ZATVORENO (2026-11-18)
- Tail komentari: reword `index.css` reference + dodat komentar uz L1849; ništa drugo (inventura potvrdila — ostale komentare su žive dok.).
- **CI `44518166979` (`895feb1`) = ALL GREEN (5/5)** — taj run builda i F (5/) close-out commit (`a178a7d`) koji je prethodno otkazan auto-cancel mehanizmom (`concurrency: ci-<branch>`, cancel-in-progress na brzim uzastopnim pushovima); a178a7d je sadržajno podskup 895feb1, pa ga pokriva.
- Vlasnički visual check: **OK** (bez render izmjene; /admin/analytics nepromijenjen).
### Faza F (7/) — dark 1.4.6/1.4.3 (Aurum dark admin sweep) · 1.4.6 accent #9B3D4F → #8A3346 · AnalyticsHub child proofs · CI Node 20→24 (2026-11-18)
- Vlasnik je odabrao (iz ponude, po redu iz stavke): **rendered axe za Aurum dark admin** (za dark 1.4.6/1.4.3), **zamračenje accent-text tokena** (za 1.4.6 accent), **rendered axe child tabova s fiksturama** (AnalyticsHub child proofs) i **minimalni Node 24 bump action runtimes** (app ostaje na Node 22).
- **1.4.6 accent (Aurum light only):** `--brand-accent-text(-light)` **#9B3D4F → #8A3346** — 7.95:1 na surface (#FFFFFF) / 7.38:1 na page (sunken #FAF6EF) — AAA 7:1 (ranije 6.62 / 6.14, AA ali ne AAA). Sirovi `--brand-accent` #9B3D4F (Button/CTA/border/hero `--nejra-hero-rose`), `--brand-accent-ring`, `--aurum-accent` i NEJRA §10 NISU mijenjani — §10 ostaje jedini izvor istine; odstupanje text-tokena je namjerno i dokumentovano (isti obrazac kao E (5/) brand-primary-text i F (4/) text-muted). Classic light/dark netaknuti (#8A641E / #D4A843 — i dalje na AA, kao i do sada).
  - `theme-ssot-sync.test.mjs`: `brand-accent-text(-light)` izbačeni iz RAW_MAP + novi dedicated test (`light: --brand-accent-text(-light) namjerno odstupa od §10 accent`) — 10/10 PASS.
  - `check_ui_contrast.py`: novi `AURUM_EXTRA_PAIRS` unosi `brand-accent-text / surface (Aurum AAA)` i `brand-accent-text / surface-sunken (Aurum AAA)` (globalni AA par ostaje za classic i Aurum dark) — strict **148/148 PASS** (144 + 4 nova). Nav-active (#EFE6D4, #8A3346 = 6.41:1) namjerno NIJE podignut na AAA prag (accent-text se tamo ne koristi kao tekst; vlasnička odluka je surface+sunken).
- **AnalyticsHub child proofs (rendered, POPULIRANO):** `e2e/a11y-admin.spec.ts` — lazy child paneli `/admin/analytics?tab=clients` i `?tab=stylists` se prvi put renderuju u axe suite-u (do sada samo overview hub bez ?tab=): `populatedClientAnalyticsFixture` (rezervacije, recenzije, manual entries, top services, statistika; zaseban fixture za otvoreni dug — `clientDebtFixture`) i `populatedStylistAnalyticsFixture` (top services + recent entries), mockano preko `page.route`; provjera URL/`data-mode`/h1, `settleAnimations`, `recordAxeCoverage` pod rutama `/admin/analytics?tab=clients (aurum-light|dark)` itd.; assert `assertableViolations([])` u oba režima (4 nova testa).
- **Aurum dark admin sweep (rendered, 15 ruta):** novi `Aurum dark admin rendered axe (sweep)` za SVIH 15 `ADMIN_ROUTES`: `configureAurumTheme` (localStorage `nejra.theme.mode=dark` + `/api/settings/public` override → `theme_active_skin: aurum`, `theme_default_mode: dark`), očekivanje `data-skin="aurum"` + `data-mode="dark"`, `settleAnimations`, axe, `recordAxeCoverage` pod `/{path} (aurum-dark)`; AAA nalazi se samo ispisuju u log (`ADMIN_DARK_AAA <route>`, bez aserta — presuđuje se po A/AA kao i do sada). Ovo je prvi rendered axe dokaz za admin rute van classic (javne rute pokriva theme-policy.spec).
- **CI Node 20→24 (minimalni bump):** `actions/checkout@v4→v5`, `actions/setup-node@v4→v5`, `actions/setup-python@v5→v6`, `actions/upload-artifact@v4→v6` (sve na node24 runtime; upload-artifact v5 i dalje radi na node20, zato v6). `node-version: 22` za app nepromijenjen (repo-ovi Node 22 kontrakt). `check_ci_index.py` PASS (386/389; 3 interaktivnih izuzeto — nepromijenjeno).
- Gates: build **289.6 KiB / 300**; `git diff --check` PASS; contrast strict **148/148**; `typecheck:e2e` PASS; lint 0 grešaka (6 poznatih `exhaustive-deps` warn-ova, CI-dozvoljeni); full sweep **205/205 PASS**.
- Rendered rezultati su dokaz koji se generiše tek u CI — eventualni nalazi iz child/dark suite-a će biti dokumentovani (nije unaprijed tvrđeno da su čisti).
- Vlasnički visual check: u toku (rosé linkovi/kickeri na svijetlom Aurumu sada #8A3346 — tamniji, isti identitet).
### Faza F (7/) — ZATVORENO (2026-11-18)
- Owner visual check: **OK** (Aurum light — rosé linkovi/kickeri u #8A3346; 4 stanja preostala netaknuta).
- **CI `44523392570` (`a8b3899`) = ALL GREEN (5/5).** Rendered a11y: sve praćene Axe rules PROLAZ / 0 violations nad **51 izmjerenim stanjem** (prije 32; +19 novi: 4 child-proof zapisa (`/admin/analytics?tab=clients|stylists (aurum-light|dark)`) + 15 Aurum dark admin ruta). `1.4.6 color-contrast-enhanced: PROLAZ 51`; `2.5.3` ostaje 0 incomplete; `1.4.3 color-contrast incomplete 18` — isključivo poznati Recharts legend `.legend-item-*-text` determination-blokovi (izmjena: SVG serijski čvor uz tekst; `hsl(var(--text))`), sada izmjereno i u `/admin/analytics (aurum-dark)` — isti uzrok kao classic, ne novi defekt.
- Accent SSOT: contrast strict 148/148; theme-ssot-sync 10/10 (novi dedicated odstupanje-test).
- CI Node 20→24: action majors na node24 (checkout v5 / setup-node v5 / setup-python v6 / upload-artifact v6); app Node 22 nepromjenjeno.

---

## 2026-11-19 · Aurum light sweep, veličina fonta i O4 · u toku

**Light sweep:** commit `b0facb3` dodaje axe provjeru 15 admin ruta u Aurum light režimu; četiri postojeće proof provjere AnalyticsHub panela obuhvataju oba režima. CI `44534293560` je 5/5. Ovo je ograničen automatizirani dokaz, ne potpuna WCAG ocjena.

**Font:** po izričitom izboru vlasnika commit `e38552b` postavlja root na 17px za cijeli web, uključujući Classic, Aurum, javni i admin dio; rem skala raste u odnosu na podrazumijevanih 16px, dok hardkodirane px veličine ne rastu. CI `44536662139` je 5/5; vizuelni pregled i ručne provjere ostaju otvoreni. Fiksni root može nadjačati korisničku podrazumijevanu veličinu fonta u browseru; treba provjeriti pristupačnost i odluku prije zaključivanja izmjene.

**O4:** commit `1b06474` zamjenjuje 13 nativnih potvrda zajedničkim dijalogom. CI `44544674553` je **4/5**: rendered a11y suite 459 prošlih, četiri pala testa za korisnike (stari testovi čekali su nativni dijalog); ostali poslovi prošli. Detalji pada su iz GitHub check anotacije, jer log i artefakt nisu dostupni iz sandboxa. O4 nije završen niti je dokazano ponašanje svih 13 tokova.

**Izmjena postojećih testova:** četiri testa deaktivacije, uklanjanja uloge i reset-linka prilagođena su novom renderovanom dijalogu. Zadržane su provjere da nema zahtjeva prije potvrde i poslije odustajanja te da potvrda šalje tačno jedan zahtjev; prethodna zaštita za nepotvrđeni email i prikaz na 320px ostaje. Dodane su provjere sadržaja, Escape/odustajanja i axe pregleda dijaloga za desktop i mobilni prikaz. Lokalni `typecheck:e2e` i lint prolaze (6 postojećih upozorenja); Chromium i izolovana baza nisu dostupni lokalno. Čeka se novi CI, kao i dodatni dokaz preostalih tokova i ručni pregled.

**CI nakon prilagođavanja testova:** commit `a30698c` → run `44548185406` = **5/5 success**, uključujući rendered a11y. Tokovi izvan testova korisnika i dalje nisu zasebno dokazani interaktivnim testovima.

**Dopuna O4 — fokus:** dijalog sada pamti aktivni element prije automatskog fokusiranja i vraća fokus nakon zatvaranja kada element još postoji; oba prikaza (desktop i mobilni drawer) koriste isti mehanizam. Četiri postojeća testa korisničkih potvrda dodatno provjeravaju povrat fokusa, uz zadržane postojeće asercije; lokalno TypeScript, E2E typecheck, 5/5 source testova i lint prolaze (6 poznatih upozorenja). Renderovani dokaz čeka CI. Posebna potvrda svih 13 tokova i vizuelni pregled i dalje su otvoreni.

**Dopuna O4 — CI dokaz:** commit `9574e7b` → run `44550068368` = **5/5 success**, rendered suite **463 passed / 0 failed / 0 skipped**, uključujući ažurirane provjere fokusa za korisničke potvrde. O4 implementacija je isporučena, ali interaktivna provjera ostalih tokova, vizuelni pregled, ručni M1/M2/M4/M5 i razmatranje fiksnog root fonta ostaju otvoreni. Nema tvrdnje o potpunoj WCAG usklađenosti.

---

## Mrtvi `aurum-stat-grid` · odobrena stavka 6

Uklonjen `frontend/src/features/dashboard/aurum-stat-grid.tsx`: pregled referenci potvrđuje da nema uvoza ni potrošača ovog fajla; aktivni dashboard koristi `features/shell/admin/ui/stat-grid.tsx`, koji ostaje netaknut. Historijski planovi ostaju arhiva, ne naredbe. CI za uklanjanje je na čekanju.

**CI uklanjanja:** `d603042` → `44563869689` = 5/5. Lokalno: TypeScript, 25 dashboard testova i svi standardni Python gates prolaze.

## M2 · Admin reflow 320 CSS px · u toku

Dodaje se rendered mjerenje horizontalnog prelijevanja dokumenta za 15 admin ruta u oba Aurum režima uz provjeru autentificirane rute i teme. To pokriva početno učitano stanje na 320 CSS px, **ne** stvarni browser zoom od 400%, sve podatke, dijaloge, tekstualne razmake niti upotrebljivost tastaturom; ručni M2 ostaje otvoren. Lokalni browser/baza nisu dostupni, CI je potreban za stvarni nalaz.

**Prvi M2 nalaz:** `edddc74` / CI `44565781934` = 4/5; 489 prolaza, četiri pada: `/admin/settings` 328px i `/admin/reservations/calendar` 339px na 320px, u oba režima. Nije ukinut niti oslabljen test. Predložene korekcije: postavke prelaze na jednu kolonu na uskim prikazima; izbor prikaza kalendara može prelomiti dugmad umjesto širenja dokumenta. Test dodatno bilježi detalje unutrašnjih dimenzija radi dijagnostike. Lokalno typecheck i build prolaze; čekaju rendered CI i vizuelni pregled.

**M2 CI rezultat:** `7081698` / `44567932983` = 5/5, rendered suite 493 prošla / 0 pala / 0 preskočenih; svih 30 mjerenja širine dokumenta na 320 CSS px je prošlo. Prvi CI je pronašao 8px i 19px prelijevanja u postavkama i kalendaru; novi raspored je popravio izmjereno početno stanje u oba Aurum režima. Ovo nije dokaz stvarnog 400% zooma, unutrašnjeg clippinga ili svih stanja; vizuelni i ručni pregled ostaje.

## Sinhronizacija matrica · u toku

Matrice `aurum-theme` i `aurum-route-coverage` dobile su aktuelnu politiku, inventar 15 mjerenih ruta i jasne granice dokaza; prethodne S0–S5 tabele su označene arhivom. Najnoviji blok u CHECKLIST/HANDOFF ima prednost nad starijim statusom. CI za dokumentaciju čeka provjeru.

**CI matrica:** `534a694` → `44570089463` = 5/5 success. Historijski dijelovi matrica ostaju isključivo arhiva; aktuelni pregledi ne proglašavaju ručne provjere završenim.

## O4 · Interaktivni dokazi preostalih potvrda · u toku

Dodane Playwright fiksure za 10 prethodno zasebno neprovjerenih tokova (blog ×2, galerija ×2, recenzije, praznik, kategorija i potkategorija usluga, SMTP lozinka i retry kampanje). Provjeravaju poruku, odustajanje, fokus, potvrdu i izolovane zahtjeve, uključujući nested dijaloge i `confirmAtLeastOnce` payload. Svi relevantni zahtjevi su presretnuti fiksurama; nije kontaktirana produkcija. Typecheck E2E prolazi; rendered rezultat tek čeka CI, nije dokaz prolaza.

**Prvi nalaz:** `b533743` / `44575707833` = 4/5; 499 prošlo, 4 pala. Dva testa su pokazala stvarni problem Escape-a pri potvrdi iz blog komentara i detalja recenzije; druga dva su bila problem fiksura/lokatora (GET zahvaćen preširokim SMTP mockom i neprecizan lokator kategorije). Ispravka ugniježđuje potvrdu unutar odgovarajućeg roditeljskog dijaloga; fiksure su precizirane bez slabljenja asercija. Lokalno typecheck, lint, build i 18 fokusiranih source testova prolaze; rendered CI je potreban za verifikaciju.

**Drugi CI:** `b9f9fe1` / `44577643353` = 4/5; 500 prošlo, tri pala. Samo premještanje potvrde u React stablo roditeljskog dijaloga nije dovoljno: Escape još može završiti na roditelju. Dodana je zaštita da zahtjev zatvaranja roditelja najprije zatvori potvrdu, bez zatvaranja roditelja; testovi i dalje zahtijevaju povrat fokusa. SMTP test je čekao pogrešan tekst dugmeta „Sačuvaj email postavke”; lokator je ispravljen. CI ponovno potreban.

**O4 rezultat:** `5407b13` / CI `44579698293` = **5/5 success**, rendered suite **503 passed / 0 failed / 0 skipped**. Deset novih fiksura pokriva blog ×2, galeriju ×2, recenzije, praznik, usluge ×2 i email ×2; prethodni korisnički testovi pokrivaju preostala tri toka. Potvrđeni su odustajanje, fokus, izolovane mutacije i odgovarajući payload za retry; SMTP potvrda samo označava brisanje do spremanja. Escape najprije zatvara potvrdu, bez gašenja roditeljskog dijaloga. Novi tokovi mjereni su na desktopu, korisnička deaktivacija i na 320px; ne tvrdi se pokrivenost svih jezika, uređaja, stanja, čitača ekrana ni puna WCAG usklađenost. O4 je kompletiran do granice ovog dokaza; ručni M1/M2/M4/M5 i vizuelni pregled ostaju otvoreni.

## Globalni font · poštovanje korisničke browser veličine · u toku

Ranije odobreno povećanje s fiksnih 17px prilagođeno je na `106.25%`: kod standardnog defaulta 16px i dalje se dobija 17px, a drugačiji browser default više nije zamijenjen fiksnom vrijednošću. Obim ostaje isti (cijeli web, Classic i Aurum); px vrijednosti ostaju nepromijenjene. Dodano je šest Chromium testova za tri stanja i browser default 16/20px, s nezavisnim iframe mjerenjem. Postojeći test 200% teksta je **ojačan**, ne oslabljen: sada duplira stvarnu početnu veličinu korijena (17→34px umjesto 17→32px) i provjerava rezultat. Lokalno typecheck, build, 25 tematskih source testova i dokumentacijske kapije prolaze; rendered CI i korisnički vizuelni pregled tek predstoje. Test ne zamjenjuje stvarne ručne provjere zooma, text-spacinga ili svih browsera.

**CI fonta:** `caeebc4` / `44585484397` = 5/5; rendered suite **509 passed / 0 failed / 0 skipped**, uključujući svih šest Chromium provjera osnovne veličine browsera i pojačane 200% testove. Pri defaultu 16px root je 17px; pri defaultu 20px je 21.25px. Ostaju vizuelni pregled te ručni M1/M2/M4/M5; ne tvrdi se potpuna WCAG usklađenost ni provjera svih browsera.

## M2 · nastavak: prioritetni ekrani · u toku

Vlasnik je prijavio da je provjera dashboarda prema prethodnim uputama (200% i 400% zoom) prošla; browser, dimenzije prozora i dodatne teme nisu navedeni, pa se ne izvodi zaključak za druge ekrane ili konfiguracije. Predstoji sistematski pregled ostalih ekrana, prioritetno korisnika, rezervacija, kalendara, finansija i postavki, zatim ostalih admin, javnih i stylist ruta/stanja; za ručni pregled potrebna je saradnja vlasnika, posebno za stanje s podacima i stvarni browser zoom.

Dodano 20 automatizovanih dopunskih testova za 5 prioritetnih admin ruta × dva Aurum režima × 200% rem teksta i WCAG text-spacing. Diferencijalno mjere nove slučajeve vidljivog `overflow: hidden/clip`; to ne otkriva sva odsijecanja, ne testira sve panele, niti zamjenjuje stvarni zoom ili ručni pregled. Nema dodira s produkcijom; CI potreban za nalaze. Postojeći testovi nisu mijenjani niti oslabljeni.

**Prvi prioritetni CI:** `473ed13` / `44600466012` = 4/5; rendered suite 521 prošao / 8 palo. Svih 10 provjera razmaka je prošlo, kao i oba 200% testa kalendara; 200% testovi četiri preostale rute prijavljuju zajedničko odsijecanje logotipa i naziva u zaglavlju, a rezervacije i odsijecanje tabele. Putanje su potvrđene u routeru i testovi dodatno provjeravaju pathname. Predložene Aurum korekcije omogućavaju prelamanje zaglavlja i horizontalno skrolabilnu, imenovanu i tastaturom fokusabilnu regiju tabele rezervacija; Classic izgled se ne mijenja. Novi CI tek treba provjeriti rješenje; ovo nije dokaz stvarnog zooma niti upotrebljivosti s podacima.

**Drugi prioritetni CI:** `b713463` / `44602275237` = 4/5; rendered suite **529 prošlo / 0 palo / 0 preskočeno**, uključujući svih 20 novih mjerenja, ali frontend lint je pao jer JSX `tabIndex` na regiji nije dozvoljen pravilom lint-a. Tab fokus sada prati stvarno skrolabilno stanje preko `ResizeObserver`, kao postojeća zajednička DataTable; dodata je provjera fokusa i pomjeranja tabele strelicom pri 200% tekstu. Lokalno lint (6 ranijih upozorenja), build, E2E typecheck i dokumentacijske kapije prolaze. Renderovani dokaz ovog dodatka čeka novi CI.

**Prioritetni segment — potvrda:** `316aed6` / `44604005507` = **5/5**, rendered suite **529 prošlo / 0 palo / 0 preskočeno**. Pri simuliranom 200% rem tekstu u oba Aurum režima početno stanje rezervacija ima skrolabilnu, fokusabilnu tabelu i test potvrđuje pomjeranje strelicom; svih 20 dopunskih mjerenja prolazi. To je ograničen dokaz: test ne pokriva stvarni browser zoom, sva unutrašnja odsijecanja, dijaloge, tabove, sadržaj s podacima ni sve preglednike. Prioritetni ručni pregled i pregled ostalih admin, javnih i stylist ekrana ostaju otvoreni; nije izvršen merge/deploy.

## M2 · preostale admin rute · u toku

Vlasnik je nakon upute za korisnike, rezervacije, kalendar, finansije i postavke na 200% i 400% javio: „Testirano sve je prošlo uredno.“ Browser, dimenzije prozora i tema nisu navedeni; bilježi se korisnikov prijavljeni rezultat za zatraženi opseg, bez zaključivanja o drugim konfiguracijama ili svim stanjima.

Dopunski testovi se proširuju na preostalih deset ruta iz postojećeg inventara 15 admin ruta: dashboard, salon, usluge, stilisti, dnevnik, blog, galerija, recenzije, analitika i loyalty. Po dva Aurum režima × simulirani 200% rem i text-spacing daju 40 novih mjerenja početnog stanja; prethodnih 20 ostaje. Dinamični detalji, drugi tabovi, podaci, stvarni zoom i ručni pregled nisu time pokriveni. Rezultati čekaju CI, a javne i stylist rute ostaju za naredne segmente.

**Prvi CI preostalih ruta:** `f7cbc51` / `44619640792` = 4/5; rendered suite 563 prošlo / 6 palo. Dnevnik prijavljuje odsijecanje tabele pri 200% rem i razmaku, a recenzije pri 200% rem, u oba režima. Ostala 34 nova mjerenja prolaze. Predložena Aurum korekcija daje imenovane, horizontalno skrolabilne regije, fokusabilne kada skrol postoji; proširen je test tastaturnog skrolanja pri 200% u oba režima. Classic izgled nije mijenjan. Lokalno lint (6 ranijih upozorenja), E2E typecheck, build, 43 fokusirana source testa i dokumentacijske kapije prolaze; rendered verifikacija čeka CI.

**CI preostalih admin ruta:** `c63ade4` / `44621387657` = **5/5**, rendered suite **569 prošlo / 0 palo / 0 preskočeno**. Svih 40 novih provjera početnih stanja i prethodnih 20 prolazi; za dnevnik i recenzije pri 200% dodatno prolaze fokus i pomjeranje skrolabilne tabele strelicom u oba Aurum režima. Mjerenje je diferencijalno i ograničeno na vidljive `overflow: hidden/clip` elemente; nije potvrda svih mogućih odsijecanja, stvarnog zooma, svih tabova, dijaloga, stanja s podacima ili drugih browsera. Ručni pregled preostalih admin ruta, javnih i stylist ekrana i njihova dalja automatizovana provjera ostaju otvoreni; nije izvršen merge/deploy.

## M2 · stylist, zatim javni ekrani · u toku

Vlasnik je tražio da se odmah pređe na stylist ekrane, a zatim javne. Dodana su 48 mjerenja za osam postojećih stylist odredišta (uključujući namjerni redirect profila na `/profil`): Aurum light/dark × 320 CSS px, simulirani 200% rem i text-spacing. Potvrđuju odredišnu rutu i temu; mjere širinu dokumenta ili diferencijalni `hidden/clip`, ne stvarni browser zoom, sva odsijecanja ili sve funkcije. Detaljne rute s parametrima, dijalozi i stanja s podacima nisu pokriveni ovim mjerenjima. Autentifikacija i baza su izolovani u CI; rezultat tek predstoji. Za preostale admin ekrane još nema prijavljenog ručnog rezultata.

**Prvi stylist CI:** `b4cd23a` / `44628150504` = 4/5; rendered suite 615 prošlo / 2 palo. Na `/stylist/schedule` pri 320 CSS px dokument je širok 419px u oba Aurum režima; preostalih 46 novih mjerenja prošlo je. Uzrok u izmjerenom lancu je zaglavlje rasporeda s datumima i dvije akcije bez prelamanja. Predložena Aurum-only korekcija dozvoljava prelamanje i čitljiv datum, a test dodatno provjerava vidljivost i položaj obje akcije unutar viewporta. Lokalno build, E2E typecheck, lint (6 ranijih upozorenja), tri fokusirana testa i dokumentacijske kapije prolaze; CI tek treba verifikovati.

**Stylist CI:** `a0bd3f2` / `44630106358` = **5/5**; rendered suite **617 prošlo / 0 palo / 0 preskočeno**. Svih 48 novih mjerenja prolazi, a oba dugmeta zaglavlja rasporeda vidljiva su unutar viewporta pri 320 CSS px. To je dokaz početnih stanja i definisanih mjera, ne dokaz stvarnog zooma, detalja s ID-ovima, učitanih podataka, dijaloga ili svih funkcija. Ručni pregled ostaje otvoren.

**Javni segment:** dodano 66 mjerenja 11 početnih ekrana u Aurum light/dark × 320 CSS px / 200% rem / text-spacing. `unsubscribe` i reset lozinke mjere se bez tokena; dinamični detalji i druga prijavljena stanja nisu pokriveni. Tri javne feature zastavice uključene su samo u presretnutom CI odgovoru postavki, a `PublicFeatureGate` nije mijenjan; URL i tema se asertuju da redirect ne daje lažni prolaz.

**Prvi javni CI:** `bce4487` / `44631674617` = 4/5; rendered suite 677 prošlo / 6 palo. Svih šest padova bilo je na rezervaciji: stvarna ruta zahtijeva prijavljenog klijenta i redirektuje neprijavljenog na login, pa provjera putanje opravdano nije dopustila lažan prolaz. Dodana je izolovana fiksura klijenta i usluga kao u postojećim booking testovima; novi CI mora potvrditi izgled stvarnog obrasca. Nisu upućivane mutacije ni korišteni stvarni podaci.

**Javni CI:** `4e83f7a` / `44633285047` = **5/5**, rendered suite **683 prošlo / 0 palo / 0 preskočeno**. Svih 66 novih mjerenja početnih javnih ekrana prolazi, uključujući obrazac rezervacije s izolovanom fiksurom klijenta; deset ostalih ekrana su neprijavljena početna stanja. Testovi ne dokazuju stvarni zoom, sve detaljne rute, forme, dijaloge, stanja podataka, korisničku percepciju ili sve browsere. Lokalno su dodatno prošla 851 frontend source testa. Ručni pregled i preostali detalji/stanja ostaju otvoreni.

**Nastavak — popunjena radna knjiga:** 18 novih testova obuhvata fiksurni unos u listi, njegov detalj i otvoreni drawer novog unosa, po oba Aurum režima i tri mjere (320 CSS px / 200% rem / text-spacing). Ruta, tema, podatak i prisutnost drawer polja se asertuju; na 320px dodatno se provjerava okvir drawera. Ostale detalje, podatke i interakcije tek treba pregledati; rezultat novog segmenta čeka CI.

**CI popunjene radne knjige:** `e934b6c` / `44690776680` = **5/5**, rendered suite **701 prošlo / 0 palo / 0 preskočeno**. Svih 18 novih mjerenja prolazi za fiksurnu listu, detalj i otvoreni drawer u oba Aurum režima; dokaz je ograničen na tu fiksuru, definisane mjere i početno stanje obrasca. Nije pregledan stvarni zoom, svi inputi i opcije drawera, promjene podataka, druge rute s ID-ovima ni čitači ekrana. Ručni pregled i dalji sistematski rad ostaju otvoreni; nema merge/deploy.

## M2 · popunjeni raspored i detalj stiliste · u toku

Dodaje se 18 mjerenja za izolovanu fiksuru potvrđenog termina: popunjeni raspored, detalj i otvoreni dijalog otkazivanja, u Aurum light/dark × 320 CSS px, 200% rem i text-spacing. Asertuju se učitani podaci, tema i ruta; dialog se zatvara Escapeom bez mutacija. Ovo ne pokriva sve statuse, akcije, podatke, niti stvarni browser zoom; CI je potreban za rezultat.

**Prvi CI popunjenog termina:** `992e4ff` / `44694947607` = 4/5; check anotacije bilježe prelijevanje popunjenog rasporeda na 323px i detalja na 352px pri viewportu 320px. Isti detalj iza otvorenog dijaloga također prelijeva; svi nalazi koje su anotacije prikazale javljaju se u oba režima osim što nisu svi slučajevi dijaloga zasebno anotirani. Testovi nisu oslabljeni. Aurum-only korekcija dozvoljava prelamanje kartice, punog naziva i akcija; dodatno se asertuje da naziv nije odsječen. Lokalno build, E2E typecheck, lint (6 ranijih upozorenja), 17 ciljnih source testova i docs gates prolaze; rendered CI predstoji.

**CI popunjenog termina stiliste:** `b0f9824` / `44696637062` = **5/5**, rendered suite **719 prošlo / 0 palo / 0 preskočeno**. Svih 18 novih mjerenja prolazi za fiksurni raspored, detalj i dijalog otkazivanja; puni naziv usluge dodatno se provjerava bez odsijecanja. Rezultat ne obuhvata sve statuse, dijaloge, stvarni zoom ni stvarne podatke.

## M2 · popunjeni javni detalji · u toku

Dodano 12 provjera za fiksurni detalj usluge s prije/poslije sadržajem i blog članak s komentarom, u Aurum light/dark × 320 CSS px / 200% rem / text-spacing. Asertuju se stvarni URL, tema i učitan sadržaj. PublicFeatureGate ostaje netaknut; blog flag se uključuje samo u izolovanom odgovoru postavki. Testovi ne pokrivaju sve javne detalje, podvrste sadržaja ni stvarni browser zoom; CI tek predstoji.

**CI javnih detalja:** `df9f78a` / `44698049861` = **5/5**, rendered suite **731 prošlo / 0 palo / 0 preskočeno**. Svih 12 mjerenja fiksurnog detalja usluge i blog članka s komentarom prolazi; to nije dokaz drugih sadržaja, svih interakcija ni stvarnog zooma.

**Nastavak javnih stanja:** 12 novih mjerenja za odabranu uslugu u javnoj rezervaciji (izolovani klijent) i otvoreni lightbox galerije, u dva Aurum režima × tri M2 mjere. Testovi asertuju odabir i kalendar, odnosno učitanu sliku, Escape i povrat fokusa; bez slanja rezervacije. Rezultat čeka CI; nisu obuhvaćene sve faze obrasca ili sve slike.

**CI javnih interaktivnih stanja:** `1170639` / `44699661651` = **5/5**, rendered suite **743 prošlo / 0 palo / 0 preskočeno**. Svih 12 novih mjerenja prolazi za fiksurnu rezervaciju s odabranom uslugom i galerijski lightbox; Escape i povrat fokusa su potvrđeni u testiranim stanjima. Ovo ne pokriva sva stanja rezervacije, slike, tekstualno odsijecanje izvan metrike, stvarni zoom, sve browser konfiguracije ni ručni vizuelni pregled. Dalji rad i ručne M2 provjere ostaju otvoreni; nema merge/deploy.

## M2 · popunjena admin analitika i dijalozi · u toku

Dodano 48 rendered provjera: popunjeni pregled analitike, detalj stiliste, četiri taba analitike klijenta (rezervacije, ručni unosi, dugovanja, recenzije) i dva detaljna dijaloga × Aurum light/dark × 320 CSS px, simuliranih 200% root teksta i text-spacing. API podaci su izolovane read-only fiksure; asertuju se ruta, tema i sadržaj odabranog stanja. Na 320 px mjeri se prelijevanje dokumenta i granica dijaloga; na većoj širini diferencijalno se mjeri `hidden`/`clip`. Nije dokaz stvarnog zooma, svih načina odsijecanja, svih podataka, jezika ili upotrebljivosti; ručni M2 ostaje otvoren. Lokalni E2E typecheck i ESLint prolaze; čekaju se rezultati CI-ja.

**Prvi CI `44706064322` (`c7372c4`): 4/5; rendered 789 prošlo / 2 pala.** Oba pada su popunjeni tab ručnih unosa pri 200% root teksta: Card `overflow:hidden` odsijeca 166 px tabele u Aurum light i dark. Ostalih 46 novih slučajeva prošlo je u ovom runu. Ispravka: tabele analitike klijenta dobijaju imenovane regije koje se, samo u Aurumu kad zaista prelijevaju, mogu fokusirati i horizontalno skrolati; bilješke ručnih unosa u Aurumu prelome tekst umjesto odsijecanja. Proširena provjera traži stvarni tastaturni scroll i čitljivu bilješku. Lokalni typecheck, lint (6 postojećih upozorenja), build i analitika source testovi prolaze; novi rendered CI tek treba potvrditi popravku.

**Potvrda popravke:** `f0ddb8a` / CI `44707895870` = **5/5 success**. Svih 48 novih slučajeva analitike u oba Aurum režima prolazi, uključujući popunjene tabove i dijaloge; pri simuliranih 200% ručni unosi imaju imenovanu fokusabilnu scroll regiju i prolazi skrol strelicom. Ovo ne zatvara ručni M2: stvarni browser zoom i text-spacing, drugi podaci, oba jezika i preostali tabovi, dijalozi, tokovi i token stanja i dalje traže zasebnu provjeru.

## M2 · postavke: obavijesti, izdanja i email · u toku

Novi paket dodaje 72 fiksurne provjere: popunjena lista obavijesti, preference sa saglasnošću, mobilna izdanja, dijalog SMTP lozinke, email predlošci i popunjena kampanja × BS/EN × Aurum light/dark × 320 CSS px / simulirani 200% root tekst / text-spacing. Provjeravaju se stvarni URL, jezik, aktivni tab i relevantni podaci; za dijalog i Escape/povrat fokusa. Fiksure su čitajuće i ne potvrđuju mutacije. Širina dokumenta i diferencijalni `hidden`/`clip` ne pokrivaju svaki vid odsijecanja ni stvarni browser zoom; ručni M2 ostaje otvoren. Lokalni E2E typecheck i lint prolaze; rendered rezultati čekaju CI.

**Prvi CI `44712994449` (`067486a`): 4/5; rendered 859 prošlo / 4 pala.** Četiri pada su preview postojećeg email predloška pri 200% root teksta u oba jezika i režima, s 91 px horizontalnog overflowa unutar `overflow:hidden` okvira. Ostalih 68 novih slučajeva je prošlo. Aurum preview sada dopušta lom sadržaja, uključujući ogledni verifikacijski kod, bez mijenjanja generisanog maila ili Classic prikaza. Dodana je provjera granica previewa i punog koda, uključujući 320px. Lokalno typecheck, lint (6 poznatih upozorenja), build i editor testovi prolaze; rendered CI potvrda predstoji.

**Potvrda popravke:** `60788fc` / CI `44715185095` = **5/5 success**. Prošlo svih 72 novih slučaja, uključujući granice previewa i čitljiv ogledni verifikacijski kod na 320 CSS px, 200% root tekstu i text-spacingu u oba jezika i režima. Provjere su fiksurne i ne dokazuju stvarni browser zoom, sva stanja/podatke ili izgled poruke u email klijentima. Ostaju preostali admin paneli/dijalozi, booking/stylist i token stanja te ručni M2 pregled.

## M2 · booking i token stanja · u toku

Dodano 108 fiksurnih provjera u BS/EN i Aurum light/dark: booking greška pri učitavanju datuma, dostupni datumi, greška termina, dostupni/zauzeti termini i popunjeni sažetak s dugom i loyaltyjem; zatim token detalj s predloženom promjenom, istekli token i uspješna/neuspjela odjava kampanje. Svako stanje se provjerava na 320 CSS px te simuliranih 200% root teksta i text-spacing, uz asertovanje jezika, rute i ključnih podataka. Unsubscribe POST je izolovan fiksurom; rezervacija se ne šalje. Testovi nisu stvarni zoom niti dokazuju sva stanja, korisničke podatke, mutacije ili potpunu pristupačnost. Lokalni E2E typecheck i ESLint prolaze; čeka se CI.

**Prvi CI `44729461242` (`0dc9ce1`): 4/5.** Vidljive anotacije pokazuju pad novog testa odjave: brojač fiksure je provjeren odmah nakon klika, prije asinhronog zahtjeva (0 umjesto 1). Potpuni log je nedostupan, pa se ostala stanja iz ovog runa ne proglašavaju potvrđenim. Test sada čeka da tačno jedan zahtjev stigne, zadržava provjeru tokena i očekivanog odgovora/stanja. Čeka se novi cijeli CI.

**Booking/token potvrda:** `07080fe` / CI `44731561761` = **5/5 success**; sve 108 fiksurnih provjera prolaze. Rezultati ne zamjenjuju stvarni zoom, sve tokove ni ručni pregled.

## M2 · finansije i stylist dijalozi · u toku

Dodano 60 slučajeva u BS/EN i oba Aurum režima: popunjena knjiga rashoda i dijalog uređivanja procijenjenog datuma, stylist odbijanje zahtjeva, no-show i prijedlog pomjeranja × 320 CSS px / simulirani 200% root tekst / text-spacing. Fiksure su read-only; provjeravaju se sadržaj, ruta, jezik, izlaz iz dijaloga i odsustvo mutacija. Pregled izvora otkrio je i postojeći `truncate` na nazivu usluge u stylist inboxu: Aurum sada dopušta prelamanje kao prethodno popravljeni raspored/detalj; dodana je geometrijska provjera punog naziva. Classic ostaje netaknut. Lokalno E2E typecheck/ESLint prolaze, rendered CI tek predstoji.

**Prvi CI `44733690473` (`7f9ff42`): 4/5.** Vidljive anotacije: otvorena knjiga rashoda i njen dijalog prelijevaju dokument 287–301 px na 320 px; puni log nije dostupan, pa ostali novi slučajevi nisu zaključeni. Popravka ograničava širinu grid-staza na kartici i filterima te dopušta skrol vlastite tabele, bez skrivanja sadržaja ili mijenjanja Classic prikaza. Dodana preciznija dijagnostika prelijevanja; CI treba potvrditi stvarnu ispravku i ostale nove testove.

**Drugi CI `44736107932` (`8fa2d6f`): 4/5.** Isti izmjereni overflow knjige ostao je 287–301 px; prethodna hipoteza o grid-stazama nije dovoljna. Lokalni browser pokušaj nije uspio zbog nedostajućih NSS/NSPR biblioteka. Mjerenje prošireno na položaj i širinu elemenata izvan viewporta; dalje ne tvrditi da je popravak potvrđen.

**Treći CI `44738847071` (`36b89ca`): 4/5.** Geometrija je pokazala da `sr-only` tekst „Nema priloga” u scrollabilnoj tabeli ima statičku poziciju izvan viewporta i doprinosi širini dokumenta; nevidljivi tekst je zadržan, a njegov neposredni omotač postaje pozicionirani kontejner. Crtica je dekorativna za čitač ekrana. Dodana provjera imena i tastaturnog horizontalnog skrola regije knjige. CI treba potvrditi rezultat; prve mjere ograničavanja grida ne treba smatrati dokazanim rješenjem.

**Potvrda finance/stylist paketa:** `fb34344` / CI `44740804314` = **5/5**, rendered **1031 prošlo / 0 palo / 0 preskočeno**. Svih 60 novih fiksurnih slučajeva prolazi u BS/EN i oba Aurum režima, uključujući 320 CSS px i simulirane prilagodbe teksta; knjiga ima pristupačno imenovanu regiju, fokus i skrol strelicom. Axe 1.4.3 na 66 ruta: 57 passed, 9 incomplete, 0 violations; 21 nepotpun kontrastni čvor traži procjenu. Ove provjere ne zatvaraju stvarni zoom, ručni text-spacing, sve tokove/podatke niti potpuni WCAG audit. Preostali pregled: admin paneli/dijalozi, booking/stylist/token stanja i ručne tastatura/fokus, čitač ekrana, forced-colors, vizuelni/reduced-motion. Nema merge/deploy.

## M2 · sadržaj admina, stylist preview i token otkazivanje · u toku

Korisnik je naknadno potvrdio: **„Stvarni browser prošao.“** Bez navedene verzije/browsera, teme, uvećanja, ruta i opsega text-spacinga; ne pretvarati to u potvrdu svih kombinacija niti ručnog text-spacinga.

Dodaje se 96 fiksurnih slučajeva u BS/EN × Aurum light/dark × 320 CSS px, simuliranih 200% root teksta i text-spacing: admin komentar bloga, slika galerije i detalj recenzije s otvorenim potvrdama (Escape/povrat fokusa, bez brisanja); parametrizirani stylist preview rekalkulacije s ručnim pomakom, učitanim prijedlogom, potvrdom bez slanja te greškom i oporavkom; otkazani token termin s razlogom i privremena greška s oporavkom. Prijedlog se presreće i verificira, a commit ne smije biti poslan. Mjere ne dokazuju sve podatke/stanja niti samu upotrebljivost. Lokalno typecheck i ESLint prolaze, CI tek predstoji.

**Prvi CI `44748274729` (`cef5063`): 4/5.** Vidljive anotacije: 200% tekst odsijeca naziv kategorije, metapodatke slike i komentar recenzije; engleski retry je „Try again“, što test nije uključio. Potpuni spisak padova nije dostupan. Aurum galerija sada prelama kategoriju i prikazuje metapodatke i kontrole ispod slike, umjesto fiksnog overlayja; komentar recenzije se prelama. Classic zadržava prethodni raspored. Testovi dodatno mjere tekst i ispravljaju BS/EN retry selektor (uključujući stylist retry); CI potvrda tek slijedi.

**Drugi CI `44752331795` (`11aca5a`): 4/5; rendered 1123 prošlo / 4 pala.** Sva četiri pada su galerijska slika na simuliranih 200% root teksta u BS/EN light/dark; vanjski `overflow-hidden` okvir još siječe 19 px sadržaja. Preostala 92 nova slučaja su prošla. Grupa akcija slike sada se može suziti i prelomiti, a test dodatno provjerava geometriju teksta i dugmadi unutar kartice; čekati novi CI.

**Treći CI `44754778737` (`86c04d2`): 4/5; rendered 1125 prošlo / 2 pala.** Galerija i mjerenje njenih kontrola sada prolaze u sve četiri prethodno pale kombinacije. Dva druga admin slučaja ugniježđenog dijaloga pala su na `stillRunning: 1` poslije jednokratnog čekanja animacija; anotacije ne identifikuju konkretnu animaciju. Test sada ograničeno ponavlja stvarno čekanje do `stillRunning: 0` (ne preskače niti dozvoljava trajnu animaciju); treba novi CI. Svi ostali novi slučajevi su u ovom runu prošli.

**Četvrti CI `44757222553` (`ae0763f`): 4/5; rendered 1126 prošlo / 1 pao.** Svih 96 novih slučajeva prošlo je; jedini pad je raniji unsubscribe-success BS/light/text-spacing na `stillRunning: 1` nakon jednokratnog čekanja. Ograničeno čekanje stvarnog mirovanja primijenjeno je i na booking/token test; treba još potvrditi cijeli CI. Nije utvrđen identitet te animacije.

**Potvrda paketa:** `794f0b9` / CI `44760046621` = **5/5; rendered 1127 prošlo / 0 palo / 0 preskočeno**. Prošlo svih 96 slučajeva: popunjeni admin blog komentar, galerijska slika i recenzija s potvrdama bez brisanja; parametrizirani stylist preview ručnog pomaka, potvrda bez commita i retry; otkazani token termin i oporavak od privremene greške. Aurum prelama galerijske metapodatke/kontrole i komentar recenzije, uz mjerenje granica; Classic stil nije mijenjan. Testovi su fiksurni i ne dokazuju sve podatke ili ponašanja. Axe 1.4.3: 57 passed, 9 incomplete, 0 violations na 66 ruta; nepotpune nalaze ručno procijeniti. Preostaju drugi admin paneli/dijalozi i booking/stylist/token stanja, ručni text-spacing, fokus/tastatura, screen reader, forced-colors, reduced-motion i vizuelni pregled. Korisnik je naveo da je stvarni browser prošao, ali opseg/browser nisu specificirani. Nema merge/deploy.

## M2 · popunjena dugovanja, statistika stiliste i neuspjela rezervacija · u toku

Dodano 72 fiksurna slučaja × BS/EN × Aurum light/dark × 320 CSS px / simulirani 200% root tekst / text-spacing: admin dugovanja preko `?tab=debtors` (popunjena lista i serverska pretraga), dugovi stiliste (lista i dijalog naplate bez slanja) i popunjena statistika, te neuspjela rezervacija s ponovnim pokušajem. Booking POST je presretnut s greškom; provjerava se zadržan sadržaj i isti idempotency ključ na ponavljanju, bez stvarne rezervacije. Uočeno iz izvora: naziv klijenta je skraćivan; Aurum sada dozvoljava prelamanje imena i kartice, Classic ostaje netaknut. Asertuje se pun prikaz imena. Ovo su izolovane fiksure, ne dokaz svih tokova, backend transakcija ili ručnog pregleda. Rezultat rendered provjera čeka CI.

**Prvi CI `44790423155` (`92df67b`): 4/5; 1195 prošlo / 4 pala.** Svi admin/stylist slučajevi i booking 320 px/text-spacing prošli su; četiri booking retry testa pri 200% root teksta istekla su nakon 60 s bez detalja o uzroku. Drugi klik sada ima ograničeno čekanje i bilježi položaj/hit-test kad ne uspije; treba ponoviti CI. Ne zaključivati uzrok unaprijed.

**Drugi CI `44793283789` (`f14431a`): 4/5; 1195 prošlo / 4 pala.** Sva četiri booking retry pada pri simuliranom 200% tekstu uzrokovao je sticky javni header koji je presretao klik; izmjereni centar dugmeta bio je iza headera. Aurum sada mjeri visinu headera i prepušta ga normalnom skrolu kad pređe 30% visine viewporta; pri smanjenju ga vraća u sticky položaj. Mjeri se ResizeObserverom i na resize, bez prisilnog klika i bez promjene Classic ponašanja. Test provjerava visok header, stvarni klik, ponovnu upotrebu ključa i povrat sticky položaja. Čeka se potvrda CI-ja; ovo ne dokazuje sve scenarije fokusa i zaglavlja.

**Potvrda paketa:** `f5dd479` / CI `44797026431` = **5/5; rendered 1199 prošlo / 0 palo / 0 preskočeno**. Svih 72 novih fiksurnih slučaja prolazi: admin dugovanja i pretraga, stylist dugovanja/dijalog bez naplate i statistika, te izolovan booking neuspjeh/ponavljanje sa istim idempotency ključem. Pri simuliranih 200% testa header prestaje biti sticky kad je visok i ponovo postaje sticky kad se smanji; klik nije forsiran. Aurum imena dužnika prelamaju se umjesto skraćivanja. Rezultat nije potvrda stvarne transakcije niti svih stanja; axe kontrast na 66 ruta ostaje 57 passed / 9 incomplete / 0 violations. Ostaju drugi paneli/tokovi, ručni text-spacing, tastatura/fokus, čitač ekrana, forced-colors, reduced-motion i vizuelni pregled. Stvarni browser pregled korisnik je prijavio kao prolaz bez detaljnog obima. Nema merge/deploy.


## M2 · Popunjena knjiga prihoda i direktna stylist rezervacija

- `f5515c1`: 48 izolovanih kombinacija u `a11y-admin.spec.ts` i `a11y-stylist.spec.ts` — BS/EN × Aurum light/dark × 320 CSS px, simulirani 200% root tekst i text-spacing; automatski i ručni prihod/edit bez spremanja, direktna rezervacija s odabranim klijentom/uslugom ili bez definisanog spola, bez slanja. Mutacije se presreću. Prvi CI `44822684989` 4/5: 320px overflow u popunjenoj knjizi prihoda.
- `99240d0`: Aurum grid i filter wrap, puni naziv usluge i relativni omotač skrivenog opisa automatskog reda; dopunjen ručni text-spacing postupak u `15_rucni-pregled.md`. [CI 44825519292](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44825519292) **5/5**, check `136596999321`: **1247 passed / 0 failed / 0 skipped**. Lokalno E2E typecheck, ciljano lintanje, frontend build, 688 Markdown linkova i hygiene prošli; opći lint bez grešaka uz 6 postojećih upozorenja.
- CSS override i mjera odsijecanja nisu stvarni zoom ni ručni vizuelni pregled. Fiksure ne potvrđuju stvarne rezervacije ili finansijske transakcije. Korisnik je ranije prijavio prolaz u stvarnom browseru bez konkretnog opsega; ručni text-spacing i širi tastatura/fokus, screen reader, forced-colors, reduced-motion i vizuelni pregled ostaju otvoreni. Axe kontrast 57 passed / 9 incomplete / 0 violations, 21 incomplete čvor za ljudsku procjenu. Nema merge/deploy.


## M2 · Klijentski detalj završene rezervacije — rad u toku

Pripremljen `frontend/e2e/m2-reservation-detail.spec.ts`: 48 fiksurnih kombinacija (BS/EN, Aurum light/dark, 320 CSS px i simulirani 200% root tekst/text-spacing), uključujući dvije stavke i prikazane iznose, nedostupnu uplatu, 503 s tastaturnim retryjem i 403 bez izlaganja serverske poruke. Zahtjevi koji mijenjaju rezervacije su blokirani. E2E typecheck, ciljano ESLint, statički recovery 3/3, frontend build, dokumentacijski linkovi i hygiene su lokalno prošli; renderovani Playwright testovi **nisu izvršeni** i njihovo ponašanje nije potvrđeno. Sandbox Chromium nema potrebne NSS/NSPR biblioteke, a GitHub TLS prekida vezu; CI `44827817777` za prethodni dokumentacijski commit i CI za ovaj rad nisu potvrđeni. Fiksurni prikaz ne dokazuje stvarne finansijske transakcije. Ručni text-spacing, širi pregled pristupačnosti i ostala M2 stanja ostaju otvoreni.


**Naknadna validacija:** GitHub veza obnovljena i `c5b23b1` pushan. CI `44830561289` 4/5: šest BS provjera iznosa nije prošlo zbog različitih Node/Chromium ICU formata (zarez/točka), bez utvrđenog pada prikaza. `28b819c` računa očekivano formatiranje u Chromiumu i zadržava provjeru svih pet konkretnih iznosa i njihovih redova. [CI 44832762454](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44832762454) **5/5, rendered 1295 prošlo / 0 palo / 0 preskočeno**, check `136621552753`. Prethodni CI `44827817777` također uspješan. Ovo je automatizovana fiksura, ne stvarna transakcija niti ručni pregled.

## M2 · Token prikaz prijedloga i dijagnostika kontrasta — provjera u toku

Dodano 48 fiksurnih slučajeva za token prikaz predloženog termina: gost i prijavljeni klijent, nepotpun termin te neispravan odgovor i tastaturni retry; BS/EN × Aurum light/dark × 320 CSS px / simulirani 200% root / text-spacing. Nema potvrđivanja, odbijanja niti pisanja. Izolovani lokalni Chromium uz mock API: **48/48**; nije stvarni backend niti ručni AT pregled. CI potvrda slijedi.

`axe-coverage.mjs` sada ispisuje sve zabilježene nepotpune uzorke, umjesto samo prvih šest, s podjelom anotacija po dužini. Dosadašnji broj 21 znači **zabilježene uzorke**, najviše tri po ruti i pravilu, ne nužno ukupan broj nepotpunih DOM čvorova. Postojeći test opisa promijenjen je samo zbog tačnijeg natpisa; garancija broja i prenosa cilja/poruke ostaje, uz novi test za svih 10 ruta i podjelu bez gubitka. Lokalno **40/40** node testova, E2E typecheck i ciljani lint. Ovo poboljšava dijagnostiku, ne mijenja axe presudu niti zatvara ručnu procjenu.
