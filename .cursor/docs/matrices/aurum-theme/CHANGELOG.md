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

**CI dokaz (2026-11-11):** nakon odobrenog `ci_fallback`, run **`43043182552`** daje ✅ **5/5**, uključujući `a11y-e2e` s **252 passed | 0 failed | 0 skipped** nad 32 rute. `test:design-spec` je zelen. Prva dva runa (`43032814134`, `43038425689`) ostaju historijski 4/5 zbog `apt` DNS-a. S0 je završen; S1 i S2 su naknadno odobreni i završeni (5/5).

**R2 riješeno 2026-11-11 odlukom `dark_yes`:** `Aurum tamna` dodaje `.dark` na `<html>` uz `data-skin="aurum"`; time se aktiviraju postojeće `dark:` varijante, a Aurum tokeni moraju imati veću specifičnost. S1 je naknadno odobren i završen (`43100889990`), S2 (`43110763869`); ova odluka nije pokrenula S1 automatski.

**Otvoreno i dalje (S0 unos, historijski):** S3 je naknadno odobreno (`approve_s3`) i završeno (`43116167107`); S4 je odobreno (`approve_s4`) i završeno (`43177106881`); R2 i odobrenja S1–S4 više nisu otvorena. **S5 čeka STOP + eksplicitno odobrenje**.

---

## 2026-11-11 · S1 · Runtime 3-state tema implementirana

**Šta:** `features/shell/theme/{theme-state.mjs,theme-state.d.mts,theme-context.tsx,theme-switcher.tsx}` + 4 nova testa; `ThemeProvider` iznad `SettingsProvider`; `ThemeSwitcher` u javnom (desktop + drawer), admin i stylist headeru; 2 Aurum CSS bloka u `globals.css` s 12 tačnih NEJRA §10 hexova (`--aurum-*`), izvedenim semantičkim HSL/raw tokenima i `color-scheme`; `fontFamily.serif` (sistemski fontovi); Q9 guard u `SettingsContext.tsx` + lokalizovana napomena u `SettingsAppearance.tsx`; 6 novih BS/EN ključeva; 4 nove `test:*` skripte + 4 CI koraka; `check_ui_contrast.py` proširen na 140 parova.

**Zašto:** Q8 (3 stanja, default classic), Q9 (Aurum fiksira paletu), Q7 (NEJRA = jedini izvor boja), R2 = `dark_yes` (`.dark` + `data-skin="aurum"`, Aurum tokeni veće specifičnosti). Vlasnik je 2026-11-11 eksplicitno odobrio S1.

**Ispravka broja parova (`use_140_four`):** K0 je pisao „30 postojećih × 2 = +60"; stvarni parser ima **26** web parova po stanju (80 ukupno = 52 web + 28 mobile). Vlasnik je odabrao zadržati **140** uz 4 nova para po Aurum stanju iz NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) → 30 × 2 = 60. **Bez izmišljanja ili korekcije boja.**

**Status:** ✅ runtime logika i source-only dokazi (`test:theme-ssot-sync`, `check_ui_contrast.py --strict` **140/140**); ✅ default `classic` rendered axe ostaje zelen u CI; 🟡 rendered axe za oba Aurum stanja, zoom/reflow i čitač ekrana do S11. **CI:** commit `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), run **`43100889990`** = **5/5 success**; `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report.zip` ID `13891846859` (331192 B); 4 nova S1 koraka (`130791757438` #155–#158) su `success`.

**Lokalni dokazi:** 203/203 `test:*` (nova 4: 5/5, 6/6, 5/5, 8/8); 5 Python gate-ova PASS (`check_doc_links` 687/222); i18n 2717/2717; `npm run build` 279,1/300 KiB (+2,2 KiB); `lint` 0 grešaka; `typecheck:e2e` 0; `git diff --check` čist. Stari `features/shell/admin/ui/*` netaknuti do S11.


---

## 2026-11-11 · S2 · Javni shell koristi Aurum token-e

**Šta:** `globals.css` dobio 155 Aurum-only linija (hero `radial-gradient`, `--nejra-hero-*` iz `const T`, serifni naslovi, semantički header/footer/katalog, `aria-current` crtica, `prefers-reduced-motion` za `drift`). NEJRA §10 dopunjen izračunatim hero kontrastom (`5.73 / 3.22 / 8.96 / 16.89:1`) odlukom `dopuna_ssot`; novi `test:public-aurum-hero-contrast` (4/4) + CI korak. `publicAurum` semantička mapa u `public-ui.ts`; klasični `:root`/`.dark` i klasični TSX netaknuti.

**Zašto:** Q7 (NEJRA jedini izvor), Q9 (bez korekcije palete), Q10 (strogi paritet). STOP uvjet iz S2 plana §9 riješen dopunom SSOT-a, ne procjenom „izgleda ok".

**Status:** ✅ source-only (`test:public-aurum-hero-contrast`, `test:theme-ssot-sync`, `check_ui_contrast.py --strict` 140/140) + ✅ **5/5 CI** run **`43110763869`** na `d1fb55d` (`d1fb55d7006e8e74c24f6f0ee018424136c92ba7`); rendered axe 252/0/0 nad 32 rute na default `classic`, artifact `13896851237`. 🟡 rendered axe za oba Aurum stanja, 320 px / zoom 400% i čitač ekrana do S11.

---

## 2026-11-11 · S3 · 5 javnih sadržajnih stranica koriste Aurum token-e

**Šta:** `globals.css` dobio **164 Aurum-only linije** za `data-aurum-page-hero`, `data-aurum-skeleton` (jedna `role="status"` regija s rezervisanom visinom), `data-aurum-surface`/`-satisfied-card`/`-contact-card`/`-comment`, `data-aurum-article*` (serifni naslov na tamnom hero-veu iz §10, kontejner bez diranja sanitiziranog HTML-a), `data-aurum-lightbox`, legacy `text-slate-*`/`bg-slate-*` → semantički tokeni, 44 px mete, vidljiv fokus, `overflow-wrap`, `forced-colors`. Nijedan novi hex: samo `hsl(var(--*))`, `var(--aurum-*)` i `var(--nejra-hero-*)` iz `const T`. `const T` i `:root`/`.dark` ostaju netaknuti; `test:theme-ssot-sync` i `check_ui_contrast.py --strict` (**140/140**) zeleni.

**Zašto:** Q7 (NEJRA jedini izvor), Q9 (bez korekcije palete), Q10 (strogi paritet), `approve_s3`. Bez `data-skin="aurum"` nijedno pravilo se ne primjenjuje, pa je default `classic` identičan — potvrđeno rendered axe **252 passed | 0 failed | 0 skipped**.

**Status:** ✅ source-only + ✅ **5/5 CI** run **`43116167107`** na `a12cf5b` (`a12cf5b3a169d8315fb1c1bd23b522178ab1022f`); artifact `13899570263`. 🟡 rendered axe za oba Aurum stanja, 320 px / zoom 400%, čitač ekrana i `1.4.6` AAA do S11; `1.4.3`/`2.5.3` ostaju nepotpuni u coverage logu.

## 2026-11-11 · S4 · 6 javnih tokova koriste postojeće Aurum tokene

**Šta:** `globals.css` dobio **130 append-only Aurum-only linija** (marker `:811`, `postcss.parse` 110 pravila). Novi selektori isključivo pod `[data-skin="aurum"]`: legacy rose/orange/purple/emerald/blue paneli → `hsl(var(--surface-muted))` + `hsl(var(--text))`; odabrani dan/termin i default dugmad → par `--primary`/`--primary-foreground` (izmjeren u `check_ui_contrast.py`); zlatni CTA → `var(--nejra-hero-gold)`/`var(--nejra-hero-onbrand)`; indikator koraka 1–4, `<time>`, status/alert regije, Radix `[role="dialog"]` u portalu, vidljiv fokus preko `var(--aurum-brand)` i `forced-colors`. **S2 (`:432`) i S3 (`:646`) blokovi imaju 0 uklonjenih linija**; `const T`, `:root`, `.dark` i 12 SSOT hexova nisu dirani.

**Zašto:** Q7 (NEJRA jedini izvor), Q9 (bez korekcije palete), Q10 (strogi paritet), `approve_s4`. Bez `data-skin="aurum"` nijedno novo pravilo se ne primjenjuje — rendered axe **252 passed | 0 failed | 0 skipped** na default `classic` to potvrđuje.

**Status:** ✅ source-only (`test:theme-ssot-sync`, `check_ui_contrast.py --strict` **140/140**) + ✅ **5/5 CI** run **`43177106881`** na `7d2ab0e` (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`); artifact `13924239127`. 🟡 rendered axe za oba Aurum stanja, 320 px / zoom 400%, čitač ekrana i `1.4.6` AAA do S11; `1.4.3`/`2.5.3` ostaju nepotpuni u coverage logu.
