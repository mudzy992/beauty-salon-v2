# Dashboard redesign — Overview (ETAPA A: plan)

**Status:** Plan **ODOBREN 2026-11-08**; Q1–Q7 riješeni po preporuci agenta (§7). ETAPA B u toku — faza 0.
**Datum plana:** 2026-11-08 · **Grana:** `arena/d2af28f4-beauty-salon-v2` · **Bazni commit:** `9df498a`
**Izvor zahtjeva:** [`docs/refaktor/PROMPT_dashboard_redesign.md`](../../../docs/refaktor/PROMPT_dashboard_redesign.md)
**Vizuelna referenca:** [`docs/refaktor/dashboard-reference.html`](../../../docs/refaktor/dashboard-reference.html)

---

## 1. Cilj

Potpuni redizajn i refaktor web dashboarda (admin `/admin/*` + stylist `/stylist/*` + autentifikovani onboarding)
tako da bude profesionalan, konzistentan i usklađen sa WCAG 2.2 (A + AA, AAA gdje je jeftino),
uz **nulte promjene funkcionalnosti, tačnosti podataka, API ugovora i palete boja**.

## 2. Paritetni ugovor (važi za svaku fazu)

Svaka faza polazi od istog ugovora. Ako bilo koja stavka ne može ostati ista — **STOP i pitanje**.

| # | Šta se ne mijenja | Kako se dokazuje |
|---|---|---|
| 1 | Funkcionalnost (nema novih/uklonjenih feature-a) | inventar funkcija po modulu + postojeći testovi |
| 2 | Prikazane vrijednosti, iznosi, datumi, statusi, filteri, sortiranje, paginacija, zbirovi, badge-evi | inventar podataka po modulu + `*-i18n`/`*-contract` testovi |
| 3 | Locale formatiranje BS/EN (`i18n/locale-utils.mjs`, `shared/business-date.mjs`) | `test:locale-formatting` |
| 4 | API endpointi, query parametri, payload-i, `queryKeys`, socket event-i | `*-api-contract` / `*-client-picker-contract` testovi |
| 5 | Role guard-ovi (`ProtectedRoute`, `StylistRoute`, `PublicOnlyRoute`) | `test:route-guards-i18n` |
| 6 | Sve postojeće URL rute (stari URL ostaje kao `<Navigate replace>`) | `admin.routes.tsx` / `router.tsx` diff |
| 7 | Paleta boja (bordo `#632238`, zlato `#D4A843`, champagne `#F5E6CC`, `#1A1A1A`/`#2D2D2D`) | `check_ui_contrast.py --strict` + diff tokena |
| 8 | Javni sajt i mobilna aplikacija (vizuelno i funkcionalno identični) | grep upotreba dijeljenih fajlova + diff |
| 9 | Backend, Prisma, migracije, tajne | ne diraju se |

## 3. Baseline (izmjereno u ETAPI A, 2026-11-08)

Ovo je referentna tačka. ETAPA B **ne smije** pogoršati nijednu stavku bez eksplicitnog obrazloženja.

| Provjera | Komanda | Rezultat |
|---|---|---|
| Produkcijski build | `cd frontend && npm run build` | **PASS** (`tsc -b` + `vite build` + bundle budget) |
| Bundle — inicijalni JS/CSS | `scripts/check-bundle-budget.mjs` | **269.0 KiB gzip** (budžet 300 KiB) → **31 KiB slobodno** |
| Bundle — Analytics ruta | isto | **114.3 KiB** (budžet 140 KiB) |
| Bundle — ReservationsCalendar ruta | isto | **95.1 KiB** (budžet 125 KiB) |
| Test skripte | svih 142 `test:*` iz `frontend/package.json` | **142/142 PASS**, 412 asertacije, 0 fail |
| i18n parity | `python3 scripts/check_i18n.py --strict` | **PASS** — BS 2575 / EN 2575 leaf ključeva, 0 missing / 0 extra |
| Kontrast tokena | `python3 scripts/check_ui_contrast.py --strict` | **PASS** — 44/44 para |
| Repo hygiene | `python3 scripts/check_repo_hygiene.py` | **PASS** (1611 tracked pathova) |
| Doc links | `python3 scripts/check_doc_links.py` | **PASS** (622 linka / 180 fajlova) |

> Napomena: prompt govori o „~110 source-contract testova“; stvarno stanje u `package.json` je **142 `test:*` skripte** i 155 `*.test.mjs` fajlova (neki fajlovi se pokreću zajedno).

## 4. Struktura plana (po `plan-first.mdc`)

| Fajl | Sadržaj |
|---|---|
| `00_overview.md` | ovaj dokument |
| [`01_phase-audit.md`](01_phase-audit.md) | **A1** — audit trenutnog stanja (činjenice iz koda) |
| [`02_design-system.md`](02_design-system.md) | **A2** — semantički tokeni, katalog komponenti, shell spec, IA + mapa objedinjavanja |
| [`03_phase-0-foundation.md`](03_phase-0-foundation.md) | Temelj: tokeni, a11y infrastruktura, shell, primitivi, page templates |
| [`04_phase-1-dashboard.md`](04_phase-1-dashboard.md) | Pilot: Dashboard (home) |
| [`05_phase-2-reservations.md`](05_phase-2-reservations.md) | Rezervacije (lista + fullscreen kalendar) |
| [`06_phase-3-daily-log.md`](06_phase-3-daily-log.md) | Dnevna knjiga |
| [`07_phase-4-finance.md`](07_phase-4-finance.md) | Finansije (KIF/KUF, knjige, katalog, dužnici) |
| [`08_phase-5-loyalty.md`](08_phase-5-loyalty.md) | Lojalnost |
| [`09_phase-6-analytics.md`](09_phase-6-analytics.md) | Analitika (Analytics + Client + Stylist) |
| [`10_phase-7-users.md`](10_phase-7-users.md) | Korisnici |
| [`11_phase-8-salon-services-stylists.md`](11_phase-8-salon-services-stylists.md) | Salon / Usluge / Frizeri (+ ServiceWorkGallery) |
| [`12_phase-9-content.md`](12_phase-9-content.md) | Sadržaj: Blog, Galerija, Recenzije |
| [`13_phase-10-settings.md`](13_phase-10-settings.md) | Postavke + Email + Notifikacije + AppReleases |
| [`14_phase-11-stylist-portal.md`](14_phase-11-stylist-portal.md) | Stylist portal |
| [`15_phase-12-onboarding-auth.md`](15_phase-12-onboarding-auth.md) | Onboarding / ForceChangePassword |
| [`16_phase-13-finalization.md`](16_phase-13-finalization.md) | Globalni a11y prolaz, dead-code sweep, docs |
| [`CHECKLIST.md`](CHECKLIST.md) | faze + ručna (rendered) provjera |
| [`CHANGELOG.md`](CHANGELOG.md) | evidencija |
| [`HANDOFF.md`](HANDOFF.md) | kontekst za nastavak |

WCAG 2.2 matrica: [`.cursor/docs/matrices/dashboard-a11y/MATRIX.md`](../../docs/matrices/dashboard-a11y/MATRIX.md).

## 5. Kapije (gates)

1. **Prije ETAPE B** — eksplicitno „plan odobren“ + odgovori na otvorena pitanja (§7).
2. **Nakon faze 0 (Temelj)** — STOP, pregled.
3. **Nakon faze 1 (Dashboard pilot)** — STOP, pregled.
4. Dalje: modul se ne započinje dok prethodni ne ispuni Definition of Done (§8).
5. Naiđe li se na **bug u postojećoj logici** — ne popravlja se tiho; zapisuje se u `HANDOFF.md` i pita.
6. Traži li redizajn **backend/API izmjenu** — STOP i pitanje.

## 6. Obim

**U obimu:** 24 admin rute + 11 stylist ruta + `/admin/reservations/calendar` + 3 onboarding/force-change rute.
Kompletan inventar ruta: [`01_phase-audit.md` §2](01_phase-audit.md).

**Van obima (NE DIRATI):** javne stranice (`app/routes/public.routes.tsx`, `PublicLayout`, `features/public-catalog`),
mobilna aplikacija (`/mobile`), backend, Prisma, API ugovori, Socket.IO događaji, tracked `.env`, migracije.

**Granični slučajevi — odluka vlasnika (OTVORENO PITANJE Q2):** `Login`, `Register`, `ResetPassword`, `Profile`.
Provjereno u kodu: `Login`/`Register` su pod `PublicOnlyRoute`, `ResetPassword` **nije** guard-ovan, `Profile` je javna ruta `/profil`
koju koristi i stylist meni (`StylistLayout` → `/profil`). Nalaze se u `PublicLayout`-u, dakle javno-orijentisani →
po promptu ostaju van redizajna. Postoji 6 pristupačnosnih testova koji ih pokrivaju. Predlog: **samo WCAG-popravke, bez redizajna**.

### Kritično upozorenje — dijeljene komponente

Izmjereno (`grep` po javnim direktorijima): javni sajt koristi `components/ui/` → `button` (15), `input` (7), `card` (7),
`label` (6), `avatar` (4), `textarea` (2), `dialog` (2), `dropdown-menu` (1), `drawer` (1);
plus `components/BeforeAfterSlider.tsx`, `components/media-image.tsx`, `components/brand/*`, `styles/globals.css`, `index.css`.

Pravilo za ETAPU B: **dijeljena komponenta se ne mijenja ako postoji i najmanji vizuelni rizik po javni sajt** —
umjesto toga ide **admin-scoped varijanta** (`cva` varijanta ili `features/shell/admin/ui/*`).
Svaka ipak dirana dijeljena komponenta dobija u `CHANGELOG.md`: grep upotreba + dokaz da javni sajt nije promijenjen.

## 7. Otvorena pitanja — **ODLUČENO 2026-11-08**

Vlasnik: „postupi po svojoj preporuci“. Sve odluke su **prihvaćene** i važe za ETAPU B.

| # | Pitanje | **ODLUKA (usvojeno)** |
|---|---|---|
| **Q1** | Dark tema | **Opcija A.** Ne uvodimo `ThemeProvider` ni prekidač (to bi bio novi feature). Postojeće `dark:` klase ostaju netaknute. Novi kod koristi semantičke tokene koji **vrijede u obje teme**, tako da dashboard bude spreman ako se tema ikad uključi. |
| **Q2** | `Login`, `Register`, `ResetPassword`, `Profile` | **Van redizajna.** Ostaju u `PublicLayout`-u; eventualne WCAG-popravke tek u fazi 13, uz zaseban dokaz. |
| **Q3** | Objedinjavanja | **M1 i M2 ODOBRENI** (Analitika → tabovi; Postavke → hub). **M3** = zajednički obrazac bez spajanja ruta. Sve stare rute ostaju `<Navigate replace>`, `?tab=` i postojeći query parametri rade. |
| **Q4** | Nove dev zavisnosti | **ODOBRENO** za `@axe-core/playwright` + `@playwright/test` (dev-only, `test:a11y-routes`) i `eslint-plugin-jsx-a11y`. Instalacija ide u fazi 0; ako `npm i` u okruženju ne uspije, to se **eksplicitno zabilježi** i nastavlja se source-contract testovima. |
| **Q5** | AAA odluke | **DA** za 2.4.13 Focus Appearance i 2.5.5 Target Size 44px (24px minimum u gustim tabelama). **DA** za 1.4.6 na body tekstu; za sporedni tekst `--text-muted` ostaje `#67676F` u javnom dijelu, a dashboard dobija admin-scoped override `#55555C` (7.39:1). **NE** za 1.4.8/1.4.9 i 2.4.12; 2.3.3 se rješava globalnim `prefers-reduced-motion`. |
| **Q6** | `Salon.tsx` 2× `<h1>` | Fiks u **fazi 8**. |
| **Q7** | `client-analytics` / `stylist-analytics` | Postaju **tabovi** unutar `/admin/analytics` (posljedica Q3/M1); stare rute redirectuju. |

## 7b. Dopunske odluke — 2026-11-09, **nakon prvog stvarnog axe runa**

DoD faze 13 (`16_phase-13-finalization.md:64`) kaže „Javni sajt i mobilna aplikacija bez
diff-a", a axe je dokazao stvarne WCAG prekršaje **upravo na javnom sajtu**. To je sukob
unutar samog plana, pa nije riješen tiho:

| # | Pitanje | **ODLUKA (vlasnik, 2026-11-09)** |
|---|---|---|
| **Q8** | `/kontakt` — axe `color-contrast` (serious, 1.4.3): `text-slate-500` na `bg-slate-200` = **3.86:1**. Fix mijenja **vidljivu boju** na javnom sajtu, što kosi s DoD t. 64. | **Zadržati fix** (`text-slate-600` = 6.15:1 na `bg-slate-200`). DoD t. 64 se tumači kao „bez nenamjernih vizuelnih regresija", ne kao „nula diff". Bilježi se u `CHANGELOG.md` uz grep + dokaz. |
| **Q9** | 2.4.1 — javni layout **nema** skip-link (prvi Tab ide na logo). Fix dodaje `<SkipLink />` + `id="main"`/`tabIndex={-1}` u `features/shell/public/public-layout.tsx`, što je na ⚠️ listi „ne dirati". | **Zadržati.** 2.4.1 je WCAG **A** i javni sajt ga stvarno krši; izmjena ima **0 vidljivih promjena** (`.skip-link` je skriven do fokusa). Bilježi se grep upotreba + dokaz (`00_overview.md:107`). |

> Ove dvije odluke **ne** šire ⚠️ listu: `features/blog/` i ostali javni template-i se i
> dalje ne diraju bez posebnog odobrenja. Q2 i dalje važi za `Login`/`Register`/
> `ResetPassword`/`Profile` („WCAG-popravke tek u fazi 13, uz zaseban dokaz" — dokaz je
> sada axe nalaz `image-alt` na `/register`).

## 7a. Historija pitanja (prije odluke)

| # | Pitanje | Preporuka agenta |
|---|---|---|
| **Q1** | **Dark tema.** Potvrđeno u kodu: `darkMode: ['class']` u `tailwind.config.js` i `.dark {…}` u `globals.css` postoje, ali **nigdje u `frontend/src` ne postoji kod koji dodaje `.dark` klasu** (nema `ThemeProvider`, nema `classList.add/toggle('dark')`, nema `data-theme`, nema `prefers-color-scheme` upita). 106 fajlova sadrži `dark:` klase koje se **nikad ne aktiviraju**. Šta radimo? | **Opcija A (preporučena):** u ETAPI B ne uvodimo prekidač; `dark:` klase ostavljamo netaknute (ne brišemo — brisanje bi bio veliki diff bez funkcionalne koristi), a novi kod pišemo semantičkim tokenima koji **rade u obje teme**. **Opcija B:** dodamo `ThemeProvider` + prekidač = **novi feature**, traži tvoje odobrenje i zaseban plan. **Opcija C:** dead-code sweep `dark:` klasa — velik diff, rizik, ne preporučujem sada. |
| **Q2** | `Login`, `Register`, `ResetPassword`, `Profile` — u obimu ili ne? | Ostaju van redizajna (javni layout); eventualno samo WCAG-popravke u fazi 13. |
| **Q3** | **Objedinjavanja ruta** (§4 u `02_design-system.md`): Analitika (3 ekrana → 1 sa tabovima), Postavke hub (Settings/Operations/Appearance/SEO + Email/Notifications/AppReleases), „Sadržaj“ obrazac. Svako objedinjavanje mijenja navigaciju i uvodi redirekcije. | Predloženo, **ne implementira se bez odobrenja**. Preporuka: odobri **samo Analitika + Postavke hub**; „Sadržaj“ ostavi kao zajednički *obrazac stranice* bez spajanja ruta. |
| **Q4** | **Nove dev zavisnosti.** Predloženo: `@axe-core/playwright` (+ `@playwright/test`) za rendered a11y smoke, i `eslint-plugin-jsx-a11y` (uz postojeći `lint` skript koji trenutno **nema instaliran ESLint** — provjereno: `eslint` nije u `devDependencies`). | Bez ovoga **ne postoji rendered a11y dokaz**; sve WCAG stavke ostaju 🟡. Predlažem odobrenje barem za axe+Playwright kao **dev-only** zavisnost, uz novi `test:a11y-routes` skript. Ako ne odobriš — nastavljam source-contract testovima i ručnom checklistom, i to jasno označavam. |
| **Q5** | **AAA odluke.** Primijeniti 1.4.6 (7:1), 2.4.13 Focus Appearance, 2.5.5 Target Size 44px, 3.3.9? | Preporuka: **DA** za 2.4.13 i 2.5.5 (44px na glavnim akcijama, 24px minimum u gustim tabelama), **DA** za 1.4.6 na body tekstu (tokeni to već zadovoljavaju), **NE** za 1.4.8/1.4.9 (zahtijevaju korisnički izbor fonta/razmaka = novi feature) i **NE** za 2.3.3 kao globalnu politiku (dovoljno je `prefers-reduced-motion`). |
| **Q6** | `Salon.tsx` ima **2 `<h1>`** (jedan h1 po stranici je cilj). Fiks sada ili u fazi 8? | U fazi 8; nije blokirajuće. |
| **Q7** | Da li **`/admin/client-analytics` i `/admin/stylist-analytics`** ostaju kao samostalne rute (trenutno **nisu u navigaciji**, dostupni samo linkom sa Analytics ekrana)? | Ako se odobri Q3, postaju tabovi; stare rute ostaju redirecti. |

## 8. Definition of Done (po modulu)

Kopirano iz prompta §6 i važi za svaku fazu:

- [ ] Sve funkcionalnosti iz inventara rade identično; nijedna ruta nije pokvarena
- [ ] Prikazani podaci/iznosi/formatiranje identični; finansijska i rezervaciona logika netaknuta
- [ ] Semantički tokeni umjesto sirovih `slate-*`/hex-ova (osim obrazloženih izuzetaka)
- [ ] Fajlovi ~100–150 linija; mrtav kod obrisan; nema duplih obrazaca
- [ ] `window.confirm` → `ConfirmDialog`; dijalozi: fokus trap, povrat fokusa, `Esc`, pristupačan naslov/opis
- [ ] WCAG 2.2 A + AA za modul (matrica ažurirana, svaki status obrazložen); AAA primijenjen ili obrazložen
- [ ] Tastatura end-to-end; vidljiv fokus (2.4.7/2.4.13); neprekriven fokus (2.4.11); mete ≥24px (2.5.8); alternativa za povlačenje (2.5.7)
- [ ] Statusne poruke najavljene (4.1.3); greške identifikovane i objašnjene (3.3.1–3.3.4)
- [ ] Reflow 320px / zoom 200–400% / text spacing bez gubitka sadržaja
- [ ] `prefers-reduced-motion` poštovan; boja nije jedini nosilac informacije
- [ ] i18n: nema hard-coded stringova; `check_i18n.py --strict` zelen
- [ ] `npm run build` prolazi (uklj. prebuild testove i bundle budget bez pogoršanja); `check_ui_contrast.py --strict`, `check_repo_hygiene.py`, `check_doc_links.py` zeleni; svi testovi zeleni
- [ ] Javni sajt i mobilna aplikacija nepromijenjeni (dokaz po diranoj dijeljenoj komponenti)
- [ ] `MATRIX.md` + `CHANGELOG.md` modula, `CHECKLIST.md`, `HANDOFF.md` ažurirani; novi testovi registrovani u `package.json` **i** `.github/workflows/ci.yml`

## 9. Rizici

| # | Rizik | Vjerovatnoća | Uticaj | Mitigacija |
|---|---|---|---|---|
| R1 | **Nema rendered/browser/screen-reader verifikacije u ovom okruženju.** Sve WCAG tvrdnje ostaju 🟡 „zadovoljeno u kodu“ dok se ne potvrdi ručno ili axe-om. | **Sigurno** | Visok | Eksplicitna legenda statusa; ručna checklista u `CHECKLIST.md`; Q4 za axe harness. Ne tvrdim ✅ bez dokaza. |
| R2 | **Krhki markup-coupled testovi.** 31 test fajl asertuje **tačne `className` stringove** (57 takvih asertacija). Primjer: `admin-settings-accessibility.test.mjs` traži doslovno `<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">`. Promjena tokena **će** srušiti te testove. | **Sigurno** | Srednji | Testovi se ažuriraju tako da zadrže **istu garanciju** (semantički token umjesto sirovog), uz obrazloženje u `CHANGELOG.md`. Nikad se ne brišu i ne slabe. |
| R3 | **Regresija javnog sajta** preko `components/ui/*`, `globals.css`, `index.css`, `brand/*`. | Srednja | **Visok** | Admin-scoped varijante; grep + diff dokaz po komponenti; javni sajt se ne redizajnira. |
| R4 | **Regresija finansijskih proračuna** (KIF/KUF, dugovanja, loyalty bodovi) pri refaktoru `features/finance` (55 fajlova, 6798 linija). | Srednja | **Visok** | Ne diraju se `amounts.ts`, `finance.types.ts`, API sloj, `export-safety`; 21 postojeći test mora ostati zelen; paritet zbir/iznosa dokazan testom ili uporednim prikazom. |
| R5 | **Bundle budget.** Inicijalni chunk je 269/300 KiB gzip. Novi shell/šabloni u inicijalnom chunku mogu probiti budžet. | Srednja | Srednji | Šabloni idu u postojeći inicijalni sloj umjesto novih zavisnosti; `check-bundle-budget.mjs` se pokreće poslije svake faze; route-level lazy ostaje (čuva `route-code-splitting.test.mjs`). |
| R6 | **i18n eksplozija.** Novi šabloni traže nove ključeve; BS/EN parity je strict gate. | Visoka | Nizak | Svaki ključ ide u oba fajla u istom commitu; `check_i18n.py --strict` poslije svake faze. |
| R7 | **Objedinjavanje ruta pokvari deep-linkove** (`?tab=`, bookmark-ovi). | Srednja | Srednji | Stare rute ostaju `<Navigate replace>`; `?tab=` se i dalje čita; uzorak već postoji (`/admin/debtors`). |
| R8 | **`react-big-calendar` nema pristupačnu tastaturnu navigaciju.** Kalendar (1196 linija) je drag&drop + resize; 2.5.7 traži alternativu. | Visoka | Srednji | Agenda/lista prikaz kao alternativa + postojeći drawer-i; ne forsiramo tastaturu u sam RBC. |
| R9 | **Obim.** 14 faza, ~40.000 linija frontend koda, 8 fajlova preko 600 linija. | **Sigurno** | Srednji | Strogo modul-po-modul, kapije poslije faze 0 i 1, male commit granice. |
| R10 | **`Salon/Services/Stylists/ServiceWorkGallery` nemaju nijedan test** (0 test fajlova) — 2839 linija bez sigurnosne mreže. | **Sigurno** | Srednji | U fazi 8 prvo dodati i18n/paritet testove, pa tek onda refaktor. |

## 10. Pretpostavke (označeno šta je potvrđeno kodom)

| # | Pretpostavka | Status |
|---|---|---|
| P1 | Dark tema se ne može aktivirati (nema `.dark` u runtime-u) | ✅ **Potvrđeno** grep-om kroz `frontend/src` (0 pogodaka za `classList.add('dark')`, `ThemeProvider`, `data-theme`, `prefers-color-scheme`) |
| P2 | Baseline je zelen (build + 142 test skripte + 4 reporske provjere) | ✅ **Potvrđeno** izvršavanjem, 2026-11-08 |
| P3 | `--input`/`--border` = `#E2E8F0` na bijeloj = **1.23:1** → ne prolazi 1.4.11 (3:1) | ✅ **Potvrđeno** proračunom istim algoritmom kao `check_ui_contrast.py` |
| P4 | `text-slate-400` (#94A3B8) na bijeloj = **2.56:1** → ne prolazi 1.4.3 | ✅ **Potvrđeno** proračunom; 26 light-mode upotreba, od toga 8 u dashboard modulima nosi stvarni tekst |
| P5 | Referentni HTML navodi tačne omjere kontrasta | ✅ **Potvrđeno** — svih 29 navedenih parova se poklapa sa mojim proračunom (npr. 20.01:1, 11.56:1, 5.35:1, 4.24:1, 3.48:1) |
| P6 | Promptova tvrdnja da `--destructive` u dark temi (`0 62.8% 30.6%` = `#7F1D1D`) ne prolazi kontrast | ⚠️ **Djelimično netačno.** Sa `--destructive-foreground` (`#F8FAFC`) daje **9.58:1** → prolazi. Problem je samo ako se `#7F1D1D` koristi kao **tekst** na `--background` (`#18181B`) → **1.77:1**. Uz to: `Button variant="destructive"` uopšte **ne koristi token**, nego hardkodirani `bg-red-600`. |
| P7 | `framer-motion` se **ne koristi** u dashboardu (samo javne stranice + Login/Register) | ✅ **Potvrđeno** grep-om → 2.3.3/`prefers-reduced-motion` rizik u dashboardu je nizak |
| P8 | `components/ui/tooltip.tsx` je mrtav kod (0 upotreba) | ✅ **Potvrđeno** grep-om |
| P9 | Postojeće `.cursor/docs/matrices/*` (reservations, daily-log, finance, client-debts, mobile-apk-update) ostaju izvor istine za poslovnu logiku | ✅ **Potvrđeno** — redizajn ih ne mijenja, samo ih referencira |
| P10 | Procjene obima po fazi | ⚠️ **Pretpostavka** na osnovu broja fajlova/linija; koriguje se nakon faze 0 i 1 |
