# CHANGELOG — aurum-theme matrica

## 2026-11-11 · K0 · Matrica kreirana (PLAN)

**Šta:** kreirana `MATRIX.md` s modelom 3 stanja (Q8), state machineom, DOM primjenom, Q9 precedencijom boja, tokenima/kontrastom (80 → 140 parova), mjestima izbornika, testovima i CI pokrivenošću.

**Zašto:** `code-hygiene-and-matrices.mdc` traži matricu za svaku bitnu funkcionalnost; odluke Q2/Q8/Q9 uvode novi feature koji mora imati jedan autoritativni opis prije S1.

**Status:** 🟡 PLAN — **nijedan red još nije implementiran**. Matrica postaje autoritativna nakon S1; tada se svaki red ažurira u ✅/🟡 s dokazom (test + CI run id).

**Fajlovi:** samo `.cursor/docs/matrices/aurum-theme/{MATRIX,CHANGELOG}.md`. Bez koda, bez commit/push.

**Otvoreno:** R2 (smije li `Aurum tamna` dodijeliti `.dark` klasu) — pitanje u STOP-sažetku S0 prije S1.

---

## 2026-11-11 · S0 · Ugovor tri stanja upisan u jedini izvor istine

**Šta:** NEJRA §10 sadrži tablicu stanja `classic` / `aurum-light` / `aurum-dark`, fiksnu Aurum paletu za svijetlo i tamno stanje, napomenu o neaktivnom `theme_primary`/`theme_accent` overrideu (Q9) i `#tok3` tablicu uživo izračunatih kontrastnih omjera (22/22 prolaze; light 3,73–17,55:1, dark 4,01–16,89:1). §12 dodaje ugovor izbornika (jedan meni, 3 opcije, `localStorage`, `data-skin`, `data-mode`, `theme-color`, `role="status"`). `test:design-spec` mutacijski provjerava ta tri stanja i token `theme_primary`.

**Zašto:** Q2/Q8/Q9 — novo je samo theme/skin; nema kombinacije klasična + tamna; Aurum fiksira paletu.

**Status:** ✅ dokumentovano i testirano; ⬜ runtime (`ThemeProvider`, CSS `[data-skin]`, switcher) dolazi u S1. Root `check_ui_contrast.py` i dalje mjeri samo izvorne `:root`/`.dark` parove (80/80); proširenje na Aurum selectore planirano je u S1. Ovo je source-only dokaz, ne rendered UI audit.

**Fajlovi:** `docs/design/NEJRA – beauty salon · Referentni dokument.html`, `frontend/scripts/design-spec.test.mjs`, `frontend/package.json`, `.github/workflows/ci.yml`. Bez izmjena u `frontend/src`.

**CI dokaz (2026-11-11):** nakon odobrenog `ci_fallback`, run **`43043182552`** daje ✅ **5/5**, uključujući `a11y-e2e` s **252 passed | 0 failed | 0 skipped** nad 32 rute. `test:design-spec` je zelen. Prva dva runa (`43032814134`, `43038425689`) ostaju historijski 4/5 zbog `apt` DNS-a. S0 je završen; S1 čeka odobrenje.

**R2 riješeno 2026-11-11 odlukom `dark_yes`:** `Aurum tamna` dodaje `.dark` na `<html>` uz `data-skin="aurum"`; time se aktiviraju postojeće `dark:` varijante, a Aurum tokeni moraju imati veću specifičnost. Odobrenje S1 i dalje čeka 5/5 CI i eksplicitno STOP-pitanje — ova odluka ne pokreće S1 automatski.

**Otvoreno i dalje:** S1 odobrenje (STOP); R2 više nije otvoreno.
