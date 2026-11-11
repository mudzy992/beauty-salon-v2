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

**Konačni status:** ✅ S0 završen po pravilu „5/5 + STOP"; vlasnik je 2026-11-11 **naknadno eksplicitno odobrio S1 i S2**, pa S1 i S2 više ne čekaju odobrenje (S3–S11 i dalje čekaju). S0 je zaključio docs-only commit `3ed3069` s runom `43046250037` = **5/5**.

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

**Otvoreno:** nema za S2; **S3 traži STOP + eksplicitno odobrenje**.

---

## Budući unosi (popunjavaju se stvarnim podacima, ne unaprijed)

S0, S1 i S2 već imaju završene unose iznad s tačnim SHA i run id-em.

| Segment | Šta se upisuje |
|---|---|
| S3–S10 | po segmentu: popis fajlova, eventualne izmjene testova (s garancijom), gzip delta po chunku, CI run id, otvorena pitanja |
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
