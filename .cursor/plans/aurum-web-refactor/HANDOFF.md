# HANDOFF — Aurum web refaktor

**Stanje:** 🟡 **S0 IMPLEMENTIRAN LOKALNO — ČEKA ZELENI CI RUN.** Plan je odobren (`approve_s0`); S1 nije započet.
**Grana:** `arena/71be6ba3-beauty-salon-v2` · **Bazni commit:** `a82020e47c1b21a3c05113e843f853a8e64baaf0`
**Datum:** 2026-11-11 · **Sljedeći korak:** `gh run watch` do 5/5 → upis run id-a → **STOP** za S1.

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
| O1 | **R2:** smije li `Aurum tamna` dodijeliti `.dark` klasu (aktivira `dark:` varijante u 85 fajlova) ili samo `data-mode`? | STOP-sažetak S0, prije S1; `02_phase-1-foundation.md` §4.6 |
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
| `check_repo_hygiene.py` | PASS (1749 putanja) |
| `check_ci_index.py` | PASS (379/382; 3 interaktivna izuzetka) |
| `check_doc_links.py` | PASS (670 linkova / 202 fajla) → ponovo provjereno nakon pisanja plana |
| `check_i18n.py --strict` | PASS (BS 2711 / EN 2711) |
| `check_ui_contrast.py --strict` | PASS (80/80) |
| `frontend`: `npm run build` | PASS (276,9 / 300 KiB gzip; `public home` 45,3 · `admin dashboard` 13,3 · `stylist inbox` 17,9 · `analytics` 114,7/140 · `calendar` 99,4/125) |
| `frontend`: svih **199** `test:*` (nakon `test:design-spec`) | **199 PASS / 0 FAIL**; `test:design-reference` 6/6, `test:design-spec` 2/2 |
| `check_ci_index.py` | 380/383 (199 frontend skripti, svaka ima CI korak) |
| `frontend`: `npm run typecheck:e2e` | 0 grešaka |
| `test:a11y-routes` lokalno | `SKIPPED` (Chromium nije instaliran) — **ne tvrdi se prolaz** |
| `git status` | S0 fajlovi stageani za commit; bez `backend/`, `mobile/`, `.env`, migracija |

---

## 6. Next steps (konkretno)

1. ~~Vlasnik odobrava plan (K0b).~~ ✅ `approve_s0`
2. ~~**S0** po `01_phase-0-design-docs.md`.~~ ✅ implementiran lokalno, sve provjere zelene.
3. **U toku:** `commit` + `push` na ovu granu → `gh run watch` → **5/5 success** → upis run id-a u `CHECKLIST.md` / `CHANGELOG.md` / ovaj fajl.
4. U STOP-sažetku S0 postaviti **O1** (R2: smije li `Aurum tamna` dodijeliti `.dark` klasu) i zatražiti odobrenje S1.
5. Zatim redom S1 → S11, svaki s 5/5 CI i ažurnim `CHECKLIST.md` / `CHANGELOG.md` / ovim `HANDOFF.md` / matricama.
6. S11 predaje dokazni paket i navodi šta ostaje za ručnu provjeru (čitač ekrana, fizički uređaj, stvarni email klijent). Bez PR-a, merge-a i deploya.

---

## 7. Pravila ponašanja za nastavak

- **Ne izmišljati.** Svaka nejasnoća → STOP + pitanje, bez „privremenog" rješenja.
- Ako refaktor zatraži backend/API izmjenu → STOP + pitanje.
- Ako se pronađe bug u postojećoj logici → ne popravljati tiho; upisati ovdje i pitati.
- Test se nikad ne briše niti slabi; ažuriranje samo uz obrazloženje u `CHANGELOG.md`.
- Svaka ✅ tvrdnja mora imati dokaz; rendered dokaz dolazi isključivo iz `a11y-e2e`.
- Raditi **samo** na `arena/71be6ba3-beauty-salon-v2`; ne dirati druge grane.
