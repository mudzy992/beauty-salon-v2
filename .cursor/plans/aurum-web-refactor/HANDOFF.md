# HANDOFF — Aurum web refaktor

**Stanje:** ✅ **S0 → S1 → S2 → S3 → S4 ZAVRŠENI (svaki 5/5).** Plan je odobren (`approve_s0`); vlasnik je odobrio S1, S2, S3 (`approve_s3`) i S4 (`approve_s4`), a na S2 STOP uvjet odabrao `dopuna_ssot`. S4 je realizovan po [05_phase-4-public-flows.md](05_phase-4-public-flows.md).
**Grana:** `arena/71be6ba3-beauty-salon-v2` · **Bazni commit:** `a82020e47c1b21a3c05113e843f853a8e64baaf0` · **S0 commiti:** `fa6d73a` (dizajn) + `bbd7ca5` (CI fallback) + `3ed3069` (konačna evidencija)
**Zeleni runovi S0:** `43043182552` (5/5, rendered axe 252/252) i `43046250037` (5/5, docs-only) · **S1:** `ae87acf` / `43100889990` · **S2:** `d1fb55d` / `43110763869` · **S3 commit:** `a12cf5b` (`a12cf5b3a169d8315fb1c1bd23b522178ab1022f`) · **S3 CI:** `43116167107` = **5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute (default `classic`), artifact `13899570263` · **Datum:** 2026-11-11 · **S4 commit:** `7d2ab0e` (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`) · **S4 CI:** **`43177106881` = 5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute (default `classic`), artifact `13924239127` (331564 B) · **Sljedeći korak:** **STOP** → pitanje „Odobravaš li S5 (auth + onboarding + NotFound)?". R2 je već riješeno (`dark_yes`); `PublicFeatureGate` nije diran.

---

## 1. Šta je urađeno

- Pročitan cijeli relevantni repozitorij: `docs/design/`, `docs/refaktor/`, `docs/audit/CI.md`, `docs/audit/UX_UI_ROUTE_INVENTORY.md`, `SOURCE_OF_TRUTH.md`, `.cursor/rules/*`, `.cursor/plans/dashboard-redesign/*`, `frontend/src/app/router.tsx` + oba route fajla, `SettingsContext.tsx`, `utils/brand-colors.mjs`, `app/providers.tsx`, `styles/globals.css`, `tailwind.config.js`, `scripts/check_ui_contrast.py`, `frontend/scripts/design-reference.test.mjs`, `.github/workflows/ci.yml`.
- Izmjerena baseline stanja (vidi §5).
- Postavljena **dva kruga pitanja** (Q1–Q6, zatim Q7–Q11); sve nejasnoće razriješene odlukama vlasnika, ništa nije pretpostavljeno.
- Napisan plan: `00_overview.md` + 12 faznih planova + `CHECKLIST.md` + `CHANGELOG.md` + `HANDOFF.md`; kreirane 2 matrice (`aurum-theme`, `aurum-route-coverage`).

**S0 urađeno (2026-11-11):** NEJRA dokument dograđen na 14 sekcija (mapa 58 ruta, 3 stanja tokena, 22/22 uživo izračunata kontrastna para, 11 šablona, ugovor teme, paritet + CI matrica, 12 segmenata); kreirana 2 vizuelna koncepta (`referentni-prijedlog-v2.html` 446 KiB, `-v3.html` 329 KiB) sa po 2 ugrađene AI ilustracije i 19 `.demo` ekrana; novi `test:design-spec` (2 testa + 7 mutacija) + CI korak; privremeni JPEG-ovi nisu u Gitu.

**Nije urađeno u S0:** produkcijski UI kod (`frontend/src`), `backend/`, `mobile/`, PR/merge/deploy. S1 je uveo jedini novi feature (izbornik teme), S2 je refaktorisao javni shell + 3 kataloške stranice; `backend/`, `mobile/` i PR/merge/deploy i dalje nisu dirani.

---

## 2. Donesene odluke (Q1–Q11) i razlozi

| Odluka | Razlog / posljedica |
|---|---|
| NEJRA dokument = **jedini izvor istine**, dograđen u punu specifikaciju | Q1 + Q7; v2/v3 su samo ilustrovani koncepti, ne ugovor |
| v2/v3 se **kreiraju** na ovoj grani | Q5; popravlja jedini baseline FAIL bez kopiranja s tuđe grane |
| **3 stanja teme**, default klasična svijetla | Q2 + Q8; jedini novi feature u cijelom projektu |
| **Aurum fiksira paletu**; runtime override neaktivan u Aurumu | Q9; `SettingsContext.tsx` se gasi za `skin=aurum`, napomena u Postavke → Izgled |
| **Sve web rute**, bez `/mobile` i `/backend` | Q3; 58 deklaracija |
| **Novi plan od nule** (zamjena šablona/tokena) | Q4; stari `.cursor/plans/dashboard-redesign/` ostaje arhiva, ne nastavlja se |
| **Strogi paritet + dopušteno grupisanje navigacije** | Q10; rute/API/podaci/guardovi/i18n/bez novih zavisnosti; `<Navigate replace>` + `?tab=` |
| **Nove AI ilustracije** ugrađene kao base64 JPEG | Q11; privremeni fajlovi se ne commit-aju |
| **Plan → odobrenje → 12 segmenata sa STOP-om** | Q6; svaki segment: commit + push + `gh run watch` do 5/5 + lokalne provjere |

---

## 3. Hijerarhija izvora (da se ne ponovi stara greška)

1. `docs/design/NEJRA – beauty salon · Referentni dokument.html` (nakon S0) — **jedini dizajn ugovor**.
2. Kod — izvor istine za **trenutno ponašanje**; dizajn nije dokaz implementacije (`SOURCE_OF_TRUTH.md`).
3. `docs/refaktor/PROMPT_dashboard_redesign.md` + `dashboard-reference.html` — historijski, **ne obavezuju** (drugačija paleta, javne stranice isključene).
4. `.cursor/plans/dashboard-redesign/` — arhiva; koristi se samo za inventar i dokaze o testovima.
5. Baseline/audit dokumenti — ažuriraju se tek u S11 sa stvarnim stanjem.

---

## 4. Otvorena pitanja / rizici (ne rješavati bez odobrenja)

| # | Pitanje | Gdje se postavlja |
|---|---|---|
| O1 | **R2:** smije li `Aurum tamna` dodijeliti `.dark` klasu (aktivira `dark:` varijante u 85 fajlova) ili samo `data-mode`? | ✅ **RIJEŠENO odlukom `dark_yes` (2026-11-11):** da, `Aurum tamna` dodaje `.dark` + `data-skin="aurum"`; Aurum tokeni moraju imati veću specifičnost. S1 je završen 5/5 (`43100889990`); R2 više nije otvoreno. |
| O2 | Gdje stoji `ThemeSwitcher` na auth/onboarding ekranima bez layouta? | ✅ **RIJEŠENO `card_header` (2026-11-11, uz `approve_s5`):** u **zaglavlje auth kartice**, uz logo i `LanguageSwitcher`, iznad `<h1>`; ne ispod forme. Odluka upisana u `CHANGELOG.md` §12 prije implementacije. |
| O3 | Hoće li se koristiti dopušteno **grupisanje navigacije** (Q10), i gdje `ThemeSwitcher` u fullscreen kalendaru? | STOP-sažetak S5, prije S6 |
| O4 | Smije li se `window.confirm` zamijeniti pristupačnim `ConfirmDialog`om (ista poruka/uvjet/efekat)? | **I dalje OTVORENO za S6–S9.** S4 je po vlastitom DoD-u zamijenio **samo** `media-consent-panel.tsx` (javni tok, `features/media-consent/*`); ostalih ~14 `window.confirm` u admin stranicama nije dirano. Pitanje se postavlja na STOP-sažetku S5/S6. |
| O5 | Ako NEJRA §05 KPI skup / §06 tok odstupa od stvarnog koda → kod je mjerodavan; razlika se bilježi i pita | S6 / S10 |
| O6 | Ako rendered axe u S11 otkrije kontrastni propust u Aurumu → minimalna korekcija samo uz odobrenje (Q9) | S11 |
| R1 | Nema Chromium-a/čitača ekrana u sandboxu → sve rendered tvrdnje 🟡 dok `a11y-e2e` ne bude zelen | cijeli projekt |
| R6 | Baseline CI je crven (1 test) → **nema pusha prije S0** | K0 |

---

## 5. Test status (izmjereno 2026-11-11)

| Provjera | Rezultat |
|---|---|
| `check_repo_hygiene.py` | PASS (1772 putanje) |
| `check_ci_index.py` | PASS (380/383; 3 interaktivna izuzetka; 199 frontend skripti, svaka ima CI korak) |
| `check_doc_links.py` | PASS (685 linkova / 222 fajla) |
| `check_i18n.py --strict` | PASS (BS 2711 / EN 2711) |
| `check_ui_contrast.py --strict` | PASS (80/80) |
| `frontend`: `npm run build` | PASS (276,9 / 300 KiB gzip; `public home` 45,3 · `admin dashboard` 13,3 · `stylist inbox` 17,9 · `analytics` 114,7/140 · `calendar` 99,4/125) |
| `frontend`: svih **199** `test:*` (nakon `test:design-spec`) | **199 PASS / 0 FAIL**; `test:design-reference` 6/6, `test:design-spec` 2/2 |
| `frontend`: `npm run typecheck:e2e` | 0 grešaka |
| `git diff --check HEAD` | čist |
| GitHub Actions `43032814134` (push, `fa6d73a`) | 4/5 ✅; `a11y-e2e` ❌ na koraku 15 `Install Chromium for Playwright` (3 pokušaja) — historijski, vanjski DNS |
| GitHub Actions `43038425689` (`workflow_dispatch`, isti commit) | 4/5 ✅; isti ❌ na koraku 15 — historijski, vanjski DNS |
| **GitHub Actions `43043182552` (push, `bbd7ca5`)** | ✅ **5/5 success**: `repo-checks`, `backend`, `frontend`, `a11y-e2e`, `mobile` |
| Rendered axe u `43043182552` | ✅ **252 passed \| 0 failed \| 0 skipped**, 32 rute; korak 15 i 16 oba ✅; `SKIPPED` zaštita nije aktivirana |
| `test:a11y-routes` lokalno | `SKIPPED` (Chromium nije instaliran u sandboxu) — rendered dokaz dolazi isključivo iz gornjeg CI runa |
| `git status` | svi S0 commiti pushani na `arena/71be6ba3-beauty-salon-v2`; radno stablo čisto |

---

## 6. Next steps (konkretno)

1. ~~Vlasnik odobrava plan (K0b).~~ ✅ `approve_s0`
2. ~~**S0** po `01_phase-0-design-docs.md`.~~ ✅ implementiran lokalno, sve provjere zelene.
3. ~~`commit` + `push` na ovu granu.~~ ✅ `fa6d73a`, pushan.
4. ✅ **5/5 ostvareno** na `43043182552` nakon odobrenog `ci_fallback` u commitu `bbd7ca5`. Prva dva historijska runa ostaju zapisana radi sljedivosti.
5. ✅ **O1/R2 je riješeno** odlukom `dark_yes`. **Sada slijedi STOP**: eksplicitno pitanje „Odobravaš li S1?" — bez odgovora se S1 ne pokreće.
6. Zatim redom S1 → S11, svaki s 5/5 CI i ažurnim `CHECKLIST.md` / `CHANGELOG.md` / ovim `HANDOFF.md` / matricama.
7. S11 predaje dokazni paket i navodi šta ostaje za ručnu provjeru (čitač ekrana, fizički uređaj, stvarni email klijent). Bez PR-a, merge-a i deploya.

---

## 6a. Riješena blokada CI — izmjereni uzrok i dokaz (2026-11-11)

Sva 4 ne-a11y posla zelena su u oba runa. U `a11y-e2e` poslu korak 15 `npx playwright install --with-deps chromium` pokreće `apt-get`, a GitHub Ubuntu 24.04 runner ne može razriješiti `azure.archive.ubuntu.com`:

```
E: Failed to fetch .../fonts-ipafont-gothic_00303-21ubuntu1_all.deb  Temporary failure resolving 'azure.archive.ubuntu.com'
E: Unable to fetch some archives, maybe run apt-get update or try with --fix-missing?
Failed to install browsers
Error: Installation process exited with code: 100
```

Korak 16 `Run rendered a11y (axe) suite` je **skipped**, pa rendered/axe dokaz ne postoji — ovo nije a11y regresija aplikacije, ali ni zelen CI. Većina sistemskih biblioteka (`libnss3`, `libatk*`, `xvfb`, `fonts-liberation`, …) već je instalirana na runneru; `apt` pokušava dohvatiti samo 9 dodatnih font paketa (21,1 MB). Zato je tehnički moguć **CI-only fallback**: prvo `npx playwright install chromium` (bez `--with-deps`), pa tek onda pokušaj `install-deps`, bez diranja axe suite, bez novih npm zavisnosti i bez `continue-on-error`. To je ipak **izmjena `ci.yml` ugovora** i ne radi se bez odobrenja vlasnika („Ne izmišljaš, sve nejasnoće pitaš").

Dodatno: ponovljeni `gh run watch` pozivi su privremeno iscrpili GitHub API rate-limit (reset 14:45 UTC); konačni status runa `43038425689` pročitan je nakon reset-a. `gh run watch` je u jednom navratu vratio `0` dok je posao još bio u toku, pa se **ne koristi** kao dokaz 5/5.

**Odluka vlasnika (2026-11-11, `ci_fallback`):** odobren je CI-only fallback u `ci.yml`: ako `npx playwright install --with-deps chromium` padne na `apt` DNS-u, pokušava se `npx playwright install chromium` (samo browser binary), zatim `node` provjerava da `chromium.executablePath()` stvarno postoji. Axe korak dodatno odbija `SKIPPED` izlaz iz `run-a11y-routes.mjs`, pa nema lažno zelenog `a11y-e2e`. Nema `continue-on-error`, nema novih npm zavisnosti, nema izmjena u `frontend/src`. Istovremeno je odlukom `dark_yes` potvrđeno R2.

**Rezultat (run `43043182552`, commit `bbd7ca5`):** svih **5/5 poslova success**. U `a11y-e2e` su korak 15 `Install Chromium for Playwright` i korak 16 `Run rendered a11y (axe) suite` ✅; job log daje `252 passed | 0 failed | 0 skipped` nad 32 rute, uz axe anotaciju pokrivenosti. Napomena: anotacija `1.4.6 color-contrast-enhanced` (AAA) prikazuje 28 prekršaja, ali to pravilo nije dio asertiranog praga suite-a; **ne tvrdi se WCAG AAA/2.2 potpuna usklađenost**, niti zamjena za čitač ekrana, zoom/reflow i fizički uređaj. S0 time ispunjava „5/5 + STOP".

---

## 7. Pravila ponašanja za nastavak

- **Ne izmišljati.** Svaka nejasnoća → STOP + pitanje, bez „privremenog" rješenja.
- Ako refaktor zatraži backend/API izmjenu → STOP + pitanje.
- Ako se pronađe bug u postojećoj logici → ne popravljati tiho; upisati ovdje i pitati.
- Test se nikad ne briše niti slabi; ažuriranje samo uz obrazloženje u `CHANGELOG.md`.
- Svaka ✅ tvrdnja mora imati dokaz; rendered dokaz dolazi isključivo iz `a11y-e2e`.
- Raditi **samo** na `arena/71be6ba3-beauty-salon-v2`; ne dirati druge grane.

---

## 8. S1 realizacija (2026-11-11) — predaja S2

**Odobrenje:** vlasnik je nakon finalnog S0 STOP-a eksplicitno rekao „Možeš nastaviti, odobravam S1 - Temelj: tokeni + 3-state tema + primitive". Nije traženo novo odobrenje za S1; **S2 je naknadno odobren („Možeš krenuti sa S2") i završen, a S3 je naknadno odobren (`approve_s3`) i završen (5/5 CI `43116167107`)**.

**Jedina nova nejasnoća riješena pitanjem:** plan je tvrdio „30 postojećih kontrastnih parova × 2 = +60", a stvarni `check_ui_contrast.py` ih je imao **26** po stanju (ukupno 80). Vlasnik je odabrao **`use_140_four`**: zadržati 140, dodati 4 para iz NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) po Aurum stanju. Nijedna boja nije izmišljena niti korigovana. Detalji u `02_phase-1-foundation.md` §10.

**Implementirano:** `features/shell/theme/` (čista state mašina + `ThemeProvider`/`useTheme` + `ThemeSwitcher` + 4 nova testa), `features/shell/aurum/ui/` (8 novih primitiva), 2 Aurum CSS bloka s 12 tačnih NEJRA hexova, `fontFamily.serif`, `ThemeProvider` iznad `SettingsProvider`, Q9 guard u `SettingsContext.tsx`, i18n napomena u `SettingsAppearance.tsx`, 6 novih BS/EN ključeva, 4 `test:*` skripte (203 ukupno), 4 nova CI koraka, `check_ui_contrast.py` na 140 parova. Stari `features/shell/admin/ui/*` i dalje rade i brišu se tek u S11.

**Lokalno izmjereno:** 203/203 `test:*`; 4 nova testa 5/5 + 6/6 + 5/5 + 8/8; 5 Python gate-ova PASS (`check_ui_contrast.py --strict` **140/140**, `check_i18n.py --strict` **2717/2717**, `check_ci_index.py` **384/387**, `check_doc_links.py` **687/222**, `check_repo_hygiene.py` **1788 nakon S1 commit-a** (prije 1772)); `npm run build` **279,1 / 300 KiB** (delta **+2,2 KiB** prema S0 276,9 KiB; analytics 114,7/140, calendar 100,0/125); `npm run lint` 0 grešaka; `typecheck:e2e` 0; `git diff --check` čist.

**CI dokaz:** commit `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), run **`43100889990`** = **5/5 success**; `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report.zip` ID `13891846859` (331192 B); 4 nova S1 koraka (`130791757438` #155–#158) su `success`. `140/140` ostaje source-only; CI log i dalje ima nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove, pa se ne tvrdi WCAG 2.2/AAA usklađenost.

**Šta još NIJE dokazano (ostaje 🟡 do S11):** rendered axe nad `aurum-light` / `aurum-dark` (CI axe pokriva samo default `classic`), zoom/reflow 320 px, čitač ekrana, fizički uređaj, `1.4.6` AAA. `test:theme-ssot-sync` i `check_ui_contrast.py` su **source-only** dokazi.

**Za S2 (ostvareno):** `ThemeSwitcher` je bio u sva 3 shella; S2 je konzumirao 6 od 8 S1 primitiva (`FilterBar`, `TableSkeleton`, `EmptyState`, `ErrorState`, `PageHeader`, `StatusBadge`) isključivo u Aurum granama. CI 5/5 je ostvaren; **S3 je pokrenut tek nakon eksplicitnog `approve_s3` vlasnika (bez diranja `PublicFeatureGate`)**.


---

## 9. S2 realizacija (2026-11-11) — predaja S3

**Odobrenje + STOP odluka:** „Možeš krenuti sa S2"; na blokadu „NEJRA §10 nema izračunat `#F5EDE0` na hero gradientu" vlasnik je odabrao **`dopuna_ssot`**. U §10 su upisana 4 omjera iz §07 bez izmjene palete; `test:public-aurum-hero-contrast` + CI korak ih ponavljaju iz `const T`.

**Implementirano:** Aurum-only CSS (155 linija) za filmski hero, serifne naslove, semantičke tokene, `aria-current` + oblik, 44 px mete, rezervisanu visinu async blokova; `publicAurum` mapa; 6 S1 primitiva u Aurum granama `PublicServices`/`PublicServiceDetail`; opcioni `showSubmit` na `FilterBar`. Klasični DOM, API, `queryKey`, stale brojači, retry, feature flagovi, `components/ui/*`, `data/*.mjs` i `package-lock.json` imaju **0 diff**. Nijedan novi vidljivi string → `bs.json`/`en.json` 0 diff.

**Lokalno izmjereno:** **204/204** `test:*` (novi 4/4); 5 Python gate-ova (`check_repo_hygiene` **1789 nakon S2 commit-a**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n` **2717/2717**, `check_ui_contrast` **140/140 source-only**); build **279,9/300 KiB** (+0,8 prema S1); `typecheck:e2e` 0; `lint` 0 grešaka / 7 warninga; `git diff --check` čist.

**CI dokaz:** commit `d1fb55d` (`d1fb55d7006e8e74c24f6f0ee018424136c92ba7`), run **`43110763869`** = **5/5 success**; `a11y-e2e` job `130825854913`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `13896851237` (331270 B, SHA256 `b27443d74d6a31b714ebf8d8a7f66958594f9147ee7bb506602d53907a7e56f4`). `140/140` i `test:theme-ssot-sync` su source-only; log i dalje ima nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove — bez tvrdnje o WCAG 2.2/AAA usklađenosti.

**Šta još NIJE dokazano (🟡 do S11):** rendered axe nad `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA.

**Za S3 (ostvareno):** vlasnik je odabrao `approve_s3`; 5 ruta + dijeljene blog komponente su u Aurum grani, `PublicFeatureGate` (`public_feature_blog/gallery/reviews`) nije diran. **S4 je naknadno odobren (`approve_s4`) i završen (5/5 `43177106881`)**.

---

## 10. S3 realizacija (2026-11-11) — predaja S4

**Odobrenje:** `ask_user s3_approval` → **`approve_s3`**, uz „Ne dirati PublicFeatureGate bez nove odluke". Nije traženo novo odobrenje za S2/S3 ni ponovljen STOP za kontrast.

**Implementirano:** 12 fajlova / +386 −90. 5 stranica + 2 dijeljene blog komponente koriste `isAurum ? <Aurum> : <doslovno klasični markup>`; 164 Aurum-only CSS linije; `EmptyState` (sljedeći korak), `ErrorState` (retry), `PageHeader`, `DialogDescription`, `fieldset/legend`, `aria-describedby`, `aria-label` iz i18n, `aria-busy`, `autoComplete="name"`, `data-aurum-cta="primary"`, ikone uz tekst, `forced-colors`, 44 px mete, `overflow-wrap`. 11 novih BS/EN ključeva (**2728/2728**). Jedini dirani test: `public-blog-share-accessibility.test.mjs` (regex + novi assert, obrazloženje u §10 S3 plana); `check_ci_index` ostaje 385/388.

**Lokalno izmjereno:** **204/204** `test:*`; 5 Python gate-ova (`check_repo_hygiene` 1789, `check_ci_index` 385/388, `check_doc_links` 687/222, `check_i18n` 2728/2728, `check_ui_contrast` 140/140 source-only); build **280,9/300 KiB** (+1,0 prema S2); `typecheck:e2e` 0; `lint` 0 grešaka / 7 warninga; `postcss.parse` 90 pravila; `git diff --check` čist.

**CI dokaz:** commit `a12cf5b` (`a12cf5b3a169d8315fb1c1bd23b522178ab1022f`), run **`43116167107`** = **5/5 success**; `a11y-e2e` job `130844618383`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `13899570263` (330688 B, SHA256 `d360f1ffc3df2b390b855a2a46eac2d38db941862b4db2c535e9f7626b456627`). `140/140` i `test:public-aurum-hero-contrast` su source-only; log i dalje ima nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove — bez tvrdnje o WCAG 2.2/AAA usklađenosti.

**Nije dirano (grep dokaz 0 diff):** endpointi, paginacija, `approved` projekcija, `parse*`, stale brojači, share/`AbortError`, validacija komentara, `dangerouslySetInnerHTML` i backend sanitizacija, `PublicFeatureGate`, `queryKey`, feature flagovi, `components/ui/*`, `BeforeAfterSlider.tsx`, `data/*.mjs`, `media-image.tsx`, `/backend`, `/mobile`, `package-lock.json`, `ci.yml`. Kontakt vrijednosti isključivo iz postavki; NEJRA §07 ilustrativni podaci nisu hard-code-ani. Nema audio/video sadržaja u dozvoljenim tagovima, pa titlovi nisu izmišljani i STOP uvjet iz §9 nije aktiviran.

**Obrazložena odstupanja (➖, detalj u §10 S3 plana):** `aria-current` na paginaciji i `aria-pressed` na kategorijama (nema numeričke paginacije ni filter tipki), `StatusBadge`/ocjena (nema statusa/ocjene u payloadu), `aria-invalid`/sažetak grešaka (greška je toast, submit logika je zabranjena), audio/video titlovi (sanitizer ih ne dozvoljava).

**Šta još NIJE dokazano (🟡 do S11):** rendered axe nad `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA.

**Za S4 (ostvareno):** `approve_s4`; 6 javnih tokova je u 3 stanja teme uz nulti FSM/API diff, run **`43177106881` = 5/5**. **S5 čeka STOP + eksplicitno odobrenje**.

---

## 11. S4 realizacija (2026-11-11) — predaja S5

**Odobrenje:** `ask_user s4_approval` → **`approve_s4`**; režim „plan → implementacija → 5/5 CI → evidencija → STOP". `PublicFeatureGate` ostaje netaknut bez nove odluke.

**Šta je urađeno:** 12 fajlova / +220 −40 na `7d2ab0e` (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`). 6 javnih tokova + 3 dijeljene komponente + `globals.css` (130 append-only Aurum-only linija) + 2 i18n fajla. `useTheme()` je dodan **prije** `if (!user) return null` u `PublicReserve`/`MyReservations`/`MyReservationDetail`; `Profile` je jednako ispravan u javnom i stylist kontekstu (`/profil`). `<time dateTime>` ×3; jedinstvena `aria-label` imena akcija kroz 2 nova BS/EN ključa; `ConfirmDialog` za revoke saglasnosti (Radix fokus-povratak). `components/ui/otp-input.tsx`, OTP `autoComplete`, svi stale `useRef` i error mapping netaknuti.

**Dokazi:** lokalno **204/204** `test:*`, 5 Python gate-ova, **2730/2730** i18n, **140/140** source-only kontrast, build **281,3/300 KiB**, `typecheck:e2e` 0, `lint` 0/7, `git diff --check` čist. CI run **`43177106881`** = **5/5 success**; `a11y-e2e` job `131043916664` = **252 passed | 0 failed | 0 skipped**, artifact `13924239127` / 331564 B / SHA256 `735f02371338766b49288e49bddd249112f148e037ff5d6a3c001502edcb6ae2`. Rendered axe je **samo default `classic`**; `1.4.6` AAA i `1.4.3`/`2.5.3` nepotpunosti ostaju u logu — bez tvrdnje o WCAG 2.2/AAA.

**Nije dirano:** rezervacijski FSM, `disabled` uslovi, `aria-pressed`/`progressbar`, validacije, idempotency, backend dostupnost, statusi, stale zaštite, API/`queryKeys`/socket, `PublicFeatureGate`, `/backend`, `/mobile`, `package-lock.json`, `ci.yml`. Nijedan test nije oslabljen ni izmijenjen.

**Za S5 (ostvareno):** `approve_s5` + **O2 = `card_header`**. O4 ostaje otvoreno za S6–S9. Sve rendered/manualne provjere Aurum stanja (M1–M7) ostaju 🟡 do S11.
