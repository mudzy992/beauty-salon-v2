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
