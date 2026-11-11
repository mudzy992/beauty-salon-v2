# HANDOFF — Aurum web refaktor

**Stanje:** ✅ **S0 ZAVRŠEN (5/5) → S1 EKSPLICITNO ODOBREN, IMPLEMENTIRAN I ZAVRŠEN (5/5).** Plan je odobren (`approve_s0`); vlasnik je 2026-11-11 rekao „Možeš nastaviti, odobravam S1 - Temelj: tokeni + 3-state tema + primitive". S1 je realizovan po [02_phase-1-foundation.md](02_phase-1-foundation.md).
**Grana:** `arena/71be6ba3-beauty-salon-v2` · **Bazni commit:** `a82020e47c1b21a3c05113e843f853a8e64baaf0` · **S0 commiti:** `fa6d73a` (dizajn) + `bbd7ca5` (CI fallback) + `3ed3069` (konačna evidencija)
**Zeleni runovi S0:** `43043182552` (5/5, rendered axe 252/252) i `43046250037` (5/5, docs-only) · **S1 commit:** `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`) · **S1 CI:** `43100889990` = **5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute (default `classic`) · **Datum:** 2026-11-11 · **Sljedeći korak:** **STOP** → pitanje „Odobravaš li S2?". R2 je već riješeno (`dark_yes`).

---

## 1. Šta je urađeno

- Pročitan cijeli relevantni repozitorij: `docs/design/`, `docs/refaktor/`, `docs/audit/CI.md`, `docs/audit/UX_UI_ROUTE_INVENTORY.md`, `SOURCE_OF_TRUTH.md`, `.cursor/rules/*`, `.cursor/plans/dashboard-redesign/*`, `frontend/src/app/router.tsx` + oba route fajla, `SettingsContext.tsx`, `utils/brand-colors.mjs`, `app/providers.tsx`, `styles/globals.css`, `tailwind.config.js`, `scripts/check_ui_contrast.py`, `frontend/scripts/design-reference.test.mjs`, `.github/workflows/ci.yml`.
- Izmjerena baseline stanja (vidi §5).
- Postavljena **dva kruga pitanja** (Q1–Q6, zatim Q7–Q11); sve nejasnoće razriješene odlukama vlasnika, ništa nije pretpostavljeno.
- Napisan plan: `00_overview.md` + 12 faznih planova + `CHECKLIST.md` + `CHANGELOG.md` + `HANDOFF.md`; kreirane 2 matrice (`aurum-theme`, `aurum-route-coverage`).

**S0 urađeno (2026-11-11):** NEJRA dokument dograđen na 14 sekcija (mapa 58 ruta, 3 stanja tokena, 22/22 uživo izračunata kontrastna para, 11 šablona, ugovor teme, paritet + CI matrica, 12 segmenata); kreirana 2 vizuelna koncepta (`referentni-prijedlog-v2.html` 446 KiB, `-v3.html` 329 KiB) sa po 2 ugrađene AI ilustracije i 19 `.demo` ekrana; novi `test:design-spec` (2 testa + 7 mutacija) + CI korak; privremeni JPEG-ovi nisu u Gitu.

**Nije urađeno:** produkcijski UI kod (`frontend/src`), `backend/`, `mobile/`, PR/merge/deploy. Commit/push/CI run slijede u ovom segmentu.

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
| O1 | **R2:** smije li `Aurum tamna` dodijeliti `.dark` klasu (aktivira `dark:` varijante u 85 fajlova) ili samo `data-mode`? | ✅ **RIJEŠENO odlukom `dark_yes` (2026-11-11):** da, `Aurum tamna` dodaje `.dark` + `data-skin="aurum"`; Aurum tokeni moraju imati veću specifičnost. S1 i dalje čeka 5/5 CI i eksplicitno odobrenje. |
| O2 | Gdje stoji `ThemeSwitcher` na auth/onboarding ekranima bez layouta? | STOP-sažetak S4, prije S5 |
| O3 | Hoće li se koristiti dopušteno **grupisanje navigacije** (Q10), i gdje `ThemeSwitcher` u fullscreen kalendaru? | STOP-sažetak S5, prije S6 |
| O4 | Smije li se `window.confirm` zamijeniti pristupačnim `ConfirmDialog`om (ista poruka/uvjet/efekat)? | STOP-sažetak S5/S6; tiče se S6–S9 |
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

**Odobrenje:** vlasnik je nakon finalnog S0 STOP-a eksplicitno rekao „Možeš nastaviti, odobravam S1 - Temelj: tokeni + 3-state tema + primitive". Nije traženo novo odobrenje za S1; **S2 i dalje traži STOP + odobrenje**.

**Jedina nova nejasnoća riješena pitanjem:** plan je tvrdio „30 postojećih kontrastnih parova × 2 = +60", a stvarni `check_ui_contrast.py` ih je imao **26** po stanju (ukupno 80). Vlasnik je odabrao **`use_140_four`**: zadržati 140, dodati 4 para iz NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) po Aurum stanju. Nijedna boja nije izmišljena niti korigovana. Detalji u `02_phase-1-foundation.md` §10.

**Implementirano:** `features/shell/theme/` (čista state mašina + `ThemeProvider`/`useTheme` + `ThemeSwitcher` + 4 nova testa), `features/shell/aurum/ui/` (8 novih primitiva), 2 Aurum CSS bloka s 12 tačnih NEJRA hexova, `fontFamily.serif`, `ThemeProvider` iznad `SettingsProvider`, Q9 guard u `SettingsContext.tsx`, i18n napomena u `SettingsAppearance.tsx`, 6 novih BS/EN ključeva, 4 `test:*` skripte (203 ukupno), 4 nova CI koraka, `check_ui_contrast.py` na 140 parova. Stari `features/shell/admin/ui/*` i dalje rade i brišu se tek u S11.

**Lokalno izmjereno:** 203/203 `test:*`; 4 nova testa 5/5 + 6/6 + 5/5 + 8/8; 5 Python gate-ova PASS (`check_ui_contrast.py --strict` **140/140**, `check_i18n.py --strict` **2717/2717**, `check_ci_index.py` **384/387**, `check_doc_links.py` **687/222**, `check_repo_hygiene.py` **1788 nakon S1 commit-a** (prije 1772)); `npm run build` **279,1 / 300 KiB** (delta **+2,2 KiB** prema S0 276,9 KiB; analytics 114,7/140, calendar 100,0/125); `npm run lint` 0 grešaka; `typecheck:e2e` 0; `git diff --check` čist.

**CI dokaz:** commit `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), run **`43100889990`** = **5/5 success**; `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report.zip` ID `13891846859` (331192 B); 4 nova S1 koraka (`130791757438` #155–#158) su `success`. `140/140` ostaje source-only; CI log i dalje ima nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove, pa se ne tvrdi WCAG 2.2/AAA usklađenost.

**Šta još NIJE dokazano (ostaje 🟡 do S11):** rendered axe nad `aurum-light` / `aurum-dark` (CI axe pokriva samo default `classic`), zoom/reflow 320 px, čitač ekrana, fizički uređaj, `1.4.6` AAA. `test:theme-ssot-sync` i `check_ui_contrast.py` su **source-only** dokazi.

**Za S2:** `ThemeSwitcher` je već u `public-layout.tsx` (desktop + drawer), `admin-chrome.tsx` i `StylistLayout.tsx`; nove primitive čekaju potrošače u S6–S10. CI 5/5 je ostvaren; S2 se ne starta bez eksplicitnog odobrenja vlasnika.
