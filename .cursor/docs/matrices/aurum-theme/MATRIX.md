# MATRIX — Aurum theme / skin sustav

> **Aktuelni M2 status:** završen na osnovu korisnikove prijave pregleda u Brave i Edge na Windowsu (200%/400%, text-spacing, sve rute/uloge/jezici/teme, verzija `718fbe0`) i automatizovanih 320px fiksura. [CI 44940081950](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44940081950) 5/5, rendered 1505/0/0. Prijava nije nezavisni audit; viewport i pojedinačna stanja nisu specificirani. Ostaju zasebne provjere tastature, čitača ekrana, stvarnog forced-colors i reduced-motion te nepotpuni axe nalazi. Detalji: `.cursor/plans/aurum-web-refactor/15_rucni-pregled.md`. Stariji statusi ispod su historijski.

> **Najnoviji M2 dokaz:** `2c98530` / CI `44920510427` **5/5, rendered 1343 prošlo / 0 palo / 0 preskočeno**. 48 fiksurnih token-proposal stanja (BS/EN, oba Aurum režima, 320 CSS px/200% root/text-spacing), uključujući nepotpun odgovor, retry i gost/prijavljeni prikaz; 320px + spacing i automatizovani Tab/Enter uz forced-colors emulaciju. Ispravljen razlomljeni tekst oznaka. Vizuelno su pregledani ciljani statični snimci i šest uzoraka legende analitike; ostali nepotpuni kontrastni uzorci i širi stvarni ručni/AT pregled ostaju otvoreni. Fiksure ne dokazuju stvarne transakcije. Detalji: `.cursor/plans/aurum-web-refactor/16_ciljani-vizuelni-pregled.md`.

> **Najnoviji M2 paket:** `99240d0` / CI `44825519292` **5/5, rendered 1247 prošlo / 0 palo / 0 preskočeno**. 48 dodatnih fiksurnih kombinacija: popunjena knjiga prihoda i edit dijalog bez spremanja; direktna stylist rezervacija s odabirom klijenta/usluge ili nedostajućim spolom, bez slanja. BS/EN, Aurum light/dark, 320 CSS px / simulirani 200% root / text-spacing. Ispravljen overflow knjige na 320px; automatizacija nije ručni pregled ni dokaz stvarne finansijske transakcije. Ručni protokol je dopunjen, ali ručni text-spacing i širi pristupni pregled ostaju otvoreni.

> **Novi M2 paket:** `f5dd479` / CI `44797026431` **5/5, rendered 1199/1199**. Dodatno 72 fiksurna slučaja za popunjena admin/stylist dugovanja i statistiku te neuspješan booking i retry; Aurum visoki javni header prelazi u normalni tok da ne prekrije kontrole. Detalji, ograničenja i preostali rad u `CHANGELOG.md`.

> **Novi M2 paket:** `794f0b9` / CI `44760046621` **5/5, rendered 1127/1127**. Potvrđeno 96 fiksurnih kombinacija za admin blog komentar/galeriju/recenziju s potvrdama, parametrizirani stylist preview/confirm/retry i token otkazivanje/retry u BS/EN, oba Aurum režima, 320 CSS px i simuliranom 200% root tekstu/text-spacingu. Korisnik je prijavio da je stvarni browser prošao, bez specifikacije browsera, tema ili obima; to ne zatvara sve M2 slučajeve ni ručni text-spacing. Detalji i preostali rad: `CHANGELOG.md`.

## Najnoviji M2 dokaz — CI `44740804314`

`fb34344` / [CI 44740804314](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44740804314): **5/5; rendered 1031 prošlo, 0 palo, 0 preskočeno**. Fiksurno su potvrđeni popunjena knjiga rashoda i edit dijalog, stylist inbox/odbijanje/no-show/pomjeranje (60 slučajeva), booking i token stanja (108, prethodni CI `44731561761`), te analitika i postavke; opseg i raniji nalazi su u `CHANGELOG.md`. Mjere su 320 CSS px, simulirani 200% root tekst i text-spacing; nisu stvarni browser zoom ni dokaz svih podataka i stanja. Knjiga ima imenovanu, tastaturom skrolabilnu regiju. Axe kontrast na 66 ruta: 57 prošlo, 9 incomplete, 0 violations; nepotpune nalaze treba ručno pregledati.

**Otvoreno:** ostali admin paneli/dijalozi i booking/stylist/token stanja, stvarni zoom i ručni text-spacing, tastatura/fokus, čitač ekrana, forced-colors, vizuelni pregled i reduced-motion. Korisnik je ranije prijavio 200%/400% prolaz prioritetnih ruta bez specifikacije browsera/teme; to ne zatvara cijeli M2. S8 razbijanje velikih fajlova nije odobreno; nema merge/deploy. Stariji statusi ispod su historijski i ne nadjačavaju ovaj blok.


## Aktuelna matrica — nakon CI `44567932983`

> Sadržaj od naslova **Arhiva S1–S5** nadalje je historija, nije aktuelna politika ni uputa. Prethodni model s tri korisnička izbora je zamijenjen; Classic nije uklonjen. Izvor izvršne politike: `frontend/src/features/shell/theme/theme-policy.mjs`, `theme-context.tsx` i `theme-switcher.tsx`.

| Stanje | Odabir | Efekat / dokaz |
|---|---|---|
| Classic | globalni skin postavljen od administratora | Classic light; lokalni toggle se ne prikazuje. Classic identitet ostaje. |
| Aurum light / dark | globalni skin Aurum; lokalni izbor režima ima prednost nad globalnim defaultom | `<html data-skin="aurum" data-mode="light|dark">`; `.dark` samo u dark; prekidač ima `aria-pressed` i statusnu najavu. |
| Fallback i spremanje | `nejra.theme.mode`; stari `nejra.theme` samo za migraciju režima | Početni globalni fallback Aurum light; nevažeći lokalni izbor prepušta odluku administratorskom defaultu. |
| Boje | NEJRA §10 + semantički tokeni | Bez izmjene zaključane palete; jedini prethodno odobreni izuzetak `brand-accent-text` je dokumentovan u planu. `check_ui_contrast.py --strict` 148/148 je **source-only**. |
| Tipografija | globalni `html { font-size: 106.25% }`: 17px uz browser default 16px | Classic, Aurum i javni/admin web; rem prati browser osnovu, hardkodirani px ne. Render test browser defaulta 16/20px: `caeebc4` / `44585484397` 5/5; vizuelni pregled ostaje. |

### Dokazi i granice

| Provjera | Dokaz | Granica |
|---|---|---|
| Tema i javni prikazi | `theme-policy.spec.ts` + CI `44567932983` 5/5 | Testirane su izričito navedene javne rute/stanja, ne sve kombinacije svih ruta. |
| Admin Aurum light/dark axe | `a11y-admin.spec.ts`: 15 ruta po režimu + 4 AnalyticsHub child proofs; CI `44567932983` | Automatska provjera početnih/izabranih stanja, ne potpuni WCAG audit; axe može prijaviti incomplete. |
| Admin reflow | 15 ruta × 2 režima, 320 CSS px, početno stanje; `7081698` / CI `44567932983`, suite 493/493 | Mjeri širinu dokumenta, ne unutrašnji gubitak sadržaja ili sve panele; nije stvarni 400% zoom. |
| Ručna provjera | M1, M4, M5 | Otvoreno; M2 zaključen po korisnikovoj prijavi i fiksurama, ali nisu dokazani ukupni AA/AAA ni rad s čitačem ekrana. |

---

## Arhiva S1–S5 — zastarjela, nije aktuelna politika

**Status:** ✅ **S1 ZAVRŠEN (2026-11-11, 5/5 CI `43100889990`).** Runtime logika postoji i lokalno je izmjerena: `features/shell/theme/*`, `ThemeProvider` iznad `SettingsProvider`, `ThemeSwitcher` u 3 shella, 2 Aurum CSS bloka, `check_ui_contrast.py --strict` **140/140**, 4 nova `test:*` (203/203 ukupno). **CI:** commit `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), run **`43100889990`** = **5/5 success**; `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report.zip` ID `13891846859` (331192 B); 4 nova S1 koraka (`130791757438` #155–#158) su `success`. Rendered axe za `aurum-light`/`aurum-dark` i dalje 🟡 do S11 — ovo je source-only + default-classic rendered dokaz, ne potvrda sva 3 stanja u browseru.
**Vlasnik:** `.cursor/plans/aurum-web-refactor/` · **Izvori odluka:** `00_overview.md` §2, `02_phase-1-foundation.md`
**Ažurirano:** 2026-11-11

---

## 1. Model stanja (Q8: jedan izbornik, 3 opcije)

| `ThemeChoice` | `data-skin` | `data-mode` | `.dark` klasa | `color-scheme` | `<meta theme-color>` | Je li default |
|---|---|---|---|---|---|---|
| `classic` | `classic` | `light` | ❌ ne | `light` | današnja `#0f172a` | **✅ DA** |
| `aurum-light` | `aurum` | `light` | ❌ ne | `light` | Aurum svijetla iz NEJRA §10 | ne |
| `aurum-dark` | `aurum` | `dark` | ✅ da (**R2 potvrđeno odlukom `dark_yes`, 2026-11-11**) | `dark` | Aurum tamna iz NEJRA §10 | ne |

**Nepostojanje 4. stanja:** kombinacija `classic` + `dark` **nije** ponuđena (Q8). Nepoznata vrijednost iz `localStorage` → `classic` (fail-closed na današnji izgled).

---

## 2. State machine i perzistencija

| Prijelaz | Trigger | Efekat |
|---|---|---|
| init | mount `ThemeProvider` | `readStoredTheme()` → `normalizeTheme()` → `applyTheme(document.documentElement)` |
| `classic → aurum-light` | klik na opciju | `data-skin=aurum`, `data-mode=light`, uklanja `.dark`, gasi runtime brand override, najava `role="status"` |
| `aurum-light → aurum-dark` | klik | `data-mode=dark`, dodaje `.dark`, `color-scheme=dark`, meta |
| bilo koje → `classic` | klik | vraća inline `--brand-*` iz `buildBrandColorVariables`, skida `.dark`, `data-skin=classic` |
| reload | — | `localStorage` (ključ `nejra.theme`) vraća zadnje stanje; bez vrijednosti → `classic` |

Fokus ostaje na kliknutom dugmetu; bez otimanja fokusa; promjena se najavljuje `role="status"` i18n ključem.

---

## 3. Primjena na DOM (vlasništvo)

| Element | Atribut | Vlasnik |
|---|---|---|
| `<html>` | `data-skin`, `data-mode`, klasa `dark`, `style.colorScheme`, inline `--brand-*` | `features/shell/theme/theme-state.mjs` + `theme-context.tsx` |
| `<meta name="theme-color">` | `content` | `theme-state.mjs` |
| `<html lang>` | prati i18n BS/EN | postojeći `i18n` (ne dira se) |
| CSS tokeni | `:root`, `.dark`, `[data-skin="aurum"][data-mode="light"]`, `.dark[data-skin="aurum"]` | `styles/globals.css` (S1) |

**Specifičnost:** Aurum blokovi (0,2,0) pobjeduju `:root` / `.dark` (0,1,0). Inline stilovi s `<html>` pobjeduju sve → zato se u Aurumu **moraju ukloniti** (Q9).

---

## 4. Precedencija boja (Q9) — najvažnije pravilo

| Stanje | `theme_primary` / `theme_accent` iz postavki | Šta pobjeduje |
|---|---|---|
| `classic` | primjenjuju se (`SettingsContext.tsx` → `buildBrandColorVariables` → inline `--brand-*`) | **korisnički override** (današnje ponašanje, netaknuto) |
| `aurum-light` / `aurum-dark` | **ne primjenjuju se**; inline `--brand-*`-varijable se uklanjaju s `<html>` | **fiksna Aurum paleta** iz NEJRA §10 |

- `buildBrandColorVariables` i `test:brand-colors` se **ne mijenjaju**; mijenja se samo *uvjet poziva*.
- U `Postavke → Izgled` (`pages/SettingsAppearance.tsx`) vidljiva i18n napomena da je override neaktivan dok je Aurum odabran.
- Povratak na `classic` ponovo primjenjuje iste korisničke boje (bez gubitka postavki).

---

## 5. Tokeni i kontrast

| Skup | Selektor | Provjera |
|---|---|---|
| Klasična svijetla | `:root` (netaknut) | `check_ui_contrast.py` — **26** parova |
| Klasična tamna (uspavana) | `.dark` (netaknut) | `check_ui_contrast.py` — **26** parova |
| Aurum svijetla | `[data-skin="aurum"][data-mode="light"]` | **30** parova: 26 postojećih + 4 NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) |
| Aurum tamna | `.dark[data-skin="aurum"]` | **30** parova: ista struktura |
| Mobile paleta | `mobile/src/theme/colors.ts` (netaknuta, Q3) | **28** parova (22 tema + 6 statusa) |

Ukupno **80 → 140 parova** (52 web klasična + 28 mobile + 60 Aurum), izmjereno **140/140 PASS**. **Ispravka K0 broja:** plan je pisao „30 postojećih", a stvarni parser ih je imao 26; odlukom vlasnika `use_140_four` (2026-11-11) razlika je popunjena s 4 stvarna para iz NEJRA §10 po Aurum stanju, bez izmišljanja boja. `test:theme-ssot-sync` čita NEJRA §10 `const T` i `globals.css` i poništava odstupanje koda od jedinog izvora istine (12 tačnih hexova + izvedeni HSL/raw tokeni). **Nijedna boja se ne koriguje bez odobrenja** (Q9): ako par padne → STOP + pitanje. Rasponi: light 3,73–17,55:1, dark 3,70–16,89:1.

---

## 6. Izbornik teme — pojavljivanje (Q3: sve web rute)

| Kontekst | Fajl | Segment | Status |
|---|---|---|---|
| Javni header + mobilni drawer | `features/shell/public/public-layout.tsx` | S1 (montaža), S2 (stil) | ✅ **S2 stil gotov** (`43110763869` / `d1fb55d`): Aurum-only semantički tokeni, `aria-current` + oblik, 44 px mete; 2× `<ThemeSwitcher />` iz S1 |
| 5 javnih sadržajnih stranica | `pages/public/PublicBlog*.tsx`, `PublicGallery.tsx`, `PublicContact.tsx`, `PublicSatisfiedClients.tsx` | **S3** | ✅ **S3** (`43116167107` / `a12cf5b`): `isAurum` grana + `data-aurum-*`, `EmptyState`/`ErrorState`/`PageHeader`, `DialogDescription`, semantički tokeni, 44 px mete, `forced-colors`; klasični markup netaknut |
| Admin header | `features/shell/admin/admin-chrome.tsx` | S1 (montaža), S6 (stil) | ✅ **S1 montirano** unutar `AdminUserMenu`; stil u S6 |
| Stylist header | `layouts/StylistLayout.tsx` | S1 (montaža), S10 (stil) | ✅ **S1 montirano** prije korisničkog menija; stil u S10 |
| Auth / onboarding / NotFound | `pages/Login.tsx` i dr. | **S5** (mjesto = otvoreno pitanje O2) | ⬜ |
| Fullscreen kalendar (izvan layouta) | `pages/ReservationsCalendar.tsx` | **S6** (mjesto = O3) | ⬜ |

A11y ugovor izbornika: `role="group"` + i18n `aria-label`, 3× `button[aria-pressed]`, meta ≥44 px, `:focus-visible` prsten ≥3:1, `role="status"` najava, `prefers-reduced-motion`, bez oslanjanja samo na boju, `2.5.3 Label in Name`.

---

## 7. Testovi i CI pokrivenost

| Test / provjera | Garancija | CI korak | Status |
|---|---|---|---|
| `test:theme-state` | 3 stanja, default, normalize, DOM atributi, localStorage | ✅ `Test NEJRA 3-state theme state machine (S1)` | ✅ **5/5** |
| `test:theme-switcher-a11y` | ARIA, i18n, 44 px, fokus, najava | ✅ `Test NEJRA theme switcher accessibility (S1)` | ✅ **6/6** |
| `test:theme-brand-precedence` | Q9: override samo u classic | ✅ `Test Aurum brand color precedence (S1)` | ✅ **5/5** |
| `test:theme-ssot-sync` | `globals.css` = NEJRA §10 | ✅ `Test Aurum CSS tokens against NEJRA SSOT (S1)` | ✅ **8/8** |
| `check_ui_contrast.py --strict` | 140/140 parova | `repo-checks` | ✅ **140/140** |
| `check_i18n.py --strict` | novi `shell.theme.*` + `adminSettings.appearance.aurumNote` u BS+EN | `repo-checks` | ✅ **2717/2717** |
| `check_ci_index.py` | 203 frontend `test:*` skripti, svaka ima CI korak | `repo-checks` | ✅ **384/387** |
| `test:a11y-routes` (CI) | rendered axe za 3 stanja | `a11y-e2e`, **S11** | 🟡 (S1: samo default `classic`) |
| CI S1 cjelina | 5 poslova + 4 nova S1 koraka | `43100889990`, `ae87acf` | ✅ **5/5 success**; default-classic axe **252/252** / 32 rute |

---

## 8. Šta se ne smije promijeniti

- Default izgled (Q8), `:root` / `.dark` blokovi, `dark:` klase u 85 fajlova — **aktiviraju se u Aurum tamnoj** (R2 potvrđeno odlukom `dark_yes`).
- `buildBrandColorVariables`, `test:brand-colors`, `SettingsSocketSync`, svi setting ključevi.
- Rute, API, `queryKeys`, socket eventi, guardovi, podaci, formati, i18n značenje postojećih ključeva.
- Bez novih npm zavisnosti; bez diranja `/mobile` (Q3) i `/backend`.

---

## 9. Statusi dokaza

✅ izmjereno · 🟡 zadovoljeno u planu/kodu, nije provjereno u renderu · ❌ nije zadovoljeno · ➖ nije primjenjivo · ⬜ nije započeto.

**Trenutno (S1):** state mašina, provider, switcher, CSS tokeni, Q9 precedencija, kontrast, i18n i 4 nova testa/CI koraka su ✅ (lokalno izmjereno; CI **5/5 `43100889990`** na `ae87acf`, 4 nova S1 koraka `success`). 🟡 ostaju: rendered axe za `aurum-light`/`aurum-dark`, zoom/reflow, čitač ekrana, `forced-colors` ručna provjera i `1.4.6` AAA — sve do S11. U sandboxu `test:a11y-routes` ispisuje `SKIPPED` i ne tvrdi prolaz; CI `a11y-e2e` rendered axe trenutno pokriva isključivo **default `classic`** (**252 passed | 0 failed | 0 skipped** nad 32 rute). `140/140` je source-only; u CI logu ostaju nepotpuni `1.4.3`/`2.5.3` i poznati `1.4.6` AAA padovi.
