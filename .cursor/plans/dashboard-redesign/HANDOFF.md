# HANDOFF — Dashboard redesign

**Stanje:** **FAZE 0–10 ZAVRŠENE** + **M1 i M2 (arhitektura) ZAVRŠENI**. Sljedeće: **faza 11
(Stylist portal)**.
**Grana:** `arena/d2af28f4-beauty-salon-v2` · **Bazni commit:** `9df498a`
**Zadnji green run:** **165/165** `test:*` · build 274.1 KiB · i18n/contrast/hygiene/doc_links PASS.
Faza 11 ima 4 commita; **DoD verificiran** (mobilna aplikacija 0 diff, `stylist-portal.api.ts` netaknut).

> ⚠️ **D9 je riješen** u `019e58a` (`fix(dashboard): D9 error stanja +
> test:daily-log-amount-parity`) — dodirnuo je **dvije** faze (Dashboard i dnevnu knjigu).
>
> ⚠️ **Nema rendered dokaza.** U okruženju nema preglednika, axe-a ni čitača ekrana, pa su
> sve WCAG tvrdnje 🟡 „zadovoljeno u kodu". `@axe-core/playwright` (Q4 odobren) i
> `eslint-plugin-jsx-a11y` ostaju **neuvezani** do faze 13.
>
> ⚠️ **Odgođeno na fazu 13:** razbijanje velikih fajlova (uklj. DoD „`EmailSettings.tsx`
> < 120 ln"), migracija tabela na `DataTable`, `fieldset` za cijelu blog formu.

---

## 1. Šta je urađeno

Kompletan plan u `.cursor/plans/dashboard-redesign/`:

- `00_overview.md` — paritetni ugovor, baseline, obim, kapije, **Q1–Q7**, DoD, 10 rizika, 10 pretpostavki
- `01_phase-audit.md` — **A1** audit: mapa ruta, veličine fajlova, boje/tokeni/dark tema, duplirani obrasci, A11Y gap, dijeljene komponente, zavisnosti
- `02_design-system.md` — **A2** semantički tokeni (svi omjeri izračunati), katalog komponenti, shell spec, IA + mapa objedinjavanja
- `03`–`16_phase-*.md` — 14 faznih planova (Temelj → Zaključak), svaki sa 9 sekcija
- `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`
- `.cursor/docs/matrices/dashboard-a11y/MATRIX.md` + `CHANGELOG.md` — WCAG 2.2 matrica

## 2. Donesene odluke (i razlozi)

| Odluka | Razlog |
|---|---|
| **Ne mijenjamo postojeće tokene** (`--background`, `--border`, `--input`, `--primary`…) — dodajemo nove semantičke | Javni sajt ih koristi; izmjena = vizuelna regresija, a prompt traži da javni sajt ostane identičan |
| **`--control-border` kao novi token** umjesto izmjene `--input` | Rješava 1.4.11 (1.23:1 → 4.24:1) bez diranja javnog sajta |
| **Zadržati Radix Drawer** u admin shellu umjesto `hidden`/disclosure iz reference | Drawer ima jači a11y ugovor (fokus trap, `Esc`) i već je testiran u `navigation-drawer-accessibility.test.mjs` |
| **Konsolidovati postojeće finance komponente** (`data-state`, `confirm-dialog`, `responsive-dialog`, `summary-cards`) umjesto praviti paralelne | Prompt §3 izričito traži; finance je već najzreliji dio |
| **Ne uvoditi theme prekidač** | To bi bio novi feature; Q1 traži odluku |
| **Ne migrirati Axios → TanStack Query** u okviru redizajna | Mijenja cache ponašanje = rizik po paritet; zabilježeno kao zasebna preporuka |
| **`framer-motion` se ne dira** | Grep pokazuje da se u dashboardu **ne koristi** (samo javne stranice + Login/Register) |
| **Drag&drop se ne uklanja** — dodaje se tastaturska alternativa | Hard constraint: nema uklanjanja feature-a; 2.5.7 traži alternativu, ne zabranu |

## 3. Otvorena pitanja / rizici

**Q1–Q7** u [`00_overview.md` §7](00_overview.md). Najvažnija:

- **Q1 dark tema** — bez odgovora ne znam da li da planiram `ThemeProvider` (novi feature) ili samo token-e koji rade u obje teme.
- ~~**Q3 objedinjavanja M1/M2**~~ ✅ **oba odobrena i oba urađena** — M2 u `56cee86`
  (`/admin/settings?tab=…`, 7 tabova), M1 u `9e4bdbc` (`/admin/analytics?tab=…`, 3 taba).
  Stare rute su `TabRedirect` koji čuva query parametre.
- **Q4 axe/Playwright** — bez toga **ne postoji rendered a11y dokaz** i sve WCAG stavke ostaju 🟡.

**Najveći rizik (R1):** u ovom okruženju nema preglednika, axe-a ni čitača ekrana.
Sve što napišem o WCAG-u biće označeno 🟡 „zadovoljeno u kodu, nije verifikovano u renderu“ — nikad ✅ bez dokaza.

## 4. Next steps (konkretno)

1. ~~Vlasnik odgovara na Q1–Q7 i daje „plan odobren“.~~ ✅ 2026-11-08
2. ~~**Faza 0 — Temelj**~~ ✅ 4 commita (`f14c786` → `71520ce`)
3. ~~**Faza 1 — Dashboard (pilot)**~~ ✅ 2 commita (`3aa3014`, `7056e17`)
4. ~~**ODLUKA ZA D9**~~ ✅ `019e58a`
5. ~~**Faze 2–10**~~ ✅ (rezervacije, dnevna knjiga, finansije, lojalnost, analitika,
   korisnici, salon/usluge/frizeri, sadržaj, postavke)
6. ~~**M1 / M2**~~ ✅ `9e4bdbc` / `56cee86`
7. **Faza 11 — Stylist portal** → plan u
   [`14_phase-11-stylist-portal.md`](14_phase-11-stylist-portal.md). **4 commita urađena**;
   preostaje samo ono što se **ne može** verificirati bez browsera (D10 reflow,
   `FormSection`/`<fieldset>` migracija) i što je zato odgođeno na fazu 13.
   Plan je ovdje bio najmanje tačan: **7 od 10 stavki** opovrgnuto, bespredmetno ili već
   zadovoljeno (vidi CHANGELOG, faza 11).
8. **Faza 12 — Onboarding / ForceChangePassword** (nedostaje `<h1>` na obje stranice).
9. **Faza 13 — Zaključak:** globalni sweep, odgođeno razbijanje fajlova, axe/Playwright,
   `eslint-plugin-jsx-a11y`, završna dokumentacija.

## 5. Test status

Zadnji puni green run: **nakon M1** (`9e4bdbc`).

| Šta | Rezultat | Kada |
|---|---|---|
| `frontend` build (`tsc -b` + vite + bundle budget) | **PASS** — **274.1 KiB** gzip (budžet 300; baseline 269.0) | M1 |
| `test:*` skripte | **161/161 PASS** (baseline 142) | M1 |
| `check_i18n.py --strict` | **PASS** — BS/EN leaf ključevi se poklapaju (baseline 2575) | M1 |
| `check_ui_contrast.py --strict` | **PASS** (80/80) | M1 |
| `check_repo_hygiene.py` | **PASS** (1672 pathova) | M1 |
| `check_doc_links.py` | **PASS** (670/202) | M1 |
| Backend testovi / migracije | **nije pokretano** — out of scope | — |
| Rendered / axe / screen-reader | **nije pokretano** — nema alata u okruženju | — |

Svaki novi test je registrovan u **oba** mjesta (`frontend/package.json` **i**
`.github/workflows/ci.yml`) i **mutacijski verificiran** (namjerno pokvaren izvor → test
mora pasti). Ukupno 161 `test:*` skripti; `test:reservation-list-api-contract` je dobio CI
korak tek u M1 (dug iz faze 3).

## 6. Bilješke za sljedećeg agenta

- Repo root je `/home/user/beauty-salon-v2`; frontend zavisnosti su instalirane (`npm ci`, 313 paketa).
- `scripts/check_ui_contrast.py` trenutno parsira **samo HSL** vrijednosti (`rgb_from_hsl`); za HEX tokene iz
  `02_design-system.md` treba proširiti parser (`rgb_from_hex` već postoji, ali se koristi samo za mobile paletu)
  i dodati rezoluciju `var(--x)` referenci.
- `admin-settings-accessibility.test.mjs:29` asertuje **doslovan** string
  `<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">` iz `features/settings/settings-shell.tsx:27`
  → prva promjena tokena u Postavkama **će** srušiti taj test. Ažurirati uz obrazloženje, ne brisati.
- `navigation-drawer-accessibility.test.mjs` asertuje doslovno
  `<DrawerContent id="admin-mobile-navigation" className="p-5">` i tačnu import liniju iz `admin-layout.tsx`.
- `route-code-splitting.test.mjs` zahtijeva `lazy()` za rute i `<Suspense fallback={<RouteLoadingFallback />}>` — ne dirati.
- `check-bundle-budget.mjs` eksplicitno provjerava da `recharts`/`rbc-*`/`react-big-calendar` **nisu** u inicijalnom entry-ju.
- Nijedan `window.confirm` **nije** zamijenjen u ETAPI A — to rade moduli (faze 4, 7, 9, 10).
  Kasnije: `window.confirm` **nije prekršaj** (pristupačan je) i **namjerno je netaknut**.

### Dodato poslije faze 10 (M1/M2)

- **🔴 Plan NIJE lista defekata.** Do sada je **8 mojih audit tvrdnji** izvor opovrgao
  (f4 5/10 · f5 D2+D3 · f6 D6 · f7 D4/D5/D3/D2 · f8 D1/D2/D6/D9/1.4.11 · f9 D1/D4/D5/D7/D8 ·
  f10 D4/D5/D6/D10). **Izvedi defekt iz izvora i asertuj ga prije nego što ga tvrdiš.**
- **🔴 `00_overview.md` §7 sadrži odgovore Q1–Q7** (usvojeni 2026-11-08). Nikad ne tvrdi
  „nije odobreno" bez čitanja §7 — upravo je tako M1 pogrešno preskočen.
- **Obrazac za tabove** (`finance-page.tsx` je referenca): `X_TABS as const` + `isXTab`
  type-guard + `xTabHref` gdje **zadani tab nema `?tab=`**. Za redirect koristiti
  `features/shell/admin/tab-redirect.tsx` — čuva postojeći query.
- **TS zamka:** `isXTab(sp.get('tab')) ? sp.get('tab')! : 'default'` proširuje tip na `string`
  → `PANELS[tab]` postaje implicitno `any` → **TS7053**. Ispravno:
  `const requested = sp.get('tab'); const tab: XTab = isXTab(requested) ? requested : 'default'`.
- **`dashboardTitleKey(pathname, search)`** — naslov dokumenta (2.4.2) mora pratiti `?tab=`.
  `shell-a11y.test.mjs` traži ≥30 ključeva u `dashboard-titles.ts` i postojanje u BS/EN;
  **redoslijed je bitan** (specifičnije prije opštijeg, jer se koristi `.find()`).
- **`NavLink` / `isAdminNavItemActive` gledaju samo `pathname`** — na hub-ruti bi sve stavke
  bile aktivne, pa `aria-current` treba postaviti **eksplicitno**.
- **🔴 Hookovi nikad nakon early return-a.** `87eeabc` je tako srušio `/admin/analytics`
  (React #310). Čuvar: `test:hooks-order` (cijeli `src/`). `tsc` ovo **ne** hvata, a
  `eslint-plugin-react-hooks` nije uvezan — pa je test jedina zaštita.
- **🔴 Nikad `git checkout -- .`** dok postoji nekcommitan rad — mutacijska skripta je tako
  obrisala cijeli M1. Restaurirati **samo** mutirani fajl iz sačuvane kopije u memoriji.
- **🔴 Čuvar koji ne može pasti nije čuvar.** Nakon pisanja asertije **namjerno pokvari
  izvor** i potvrdi pad; broji (`grep -oE … | wc -l`), ne `grep -c` (broji linije i vraća
  exit 1 na 0).
- **Ne dijeli/premještaj fajlove koje testovi čitaju po putanji** — 13 testova čita
  `pages/*.tsx` direktno; hub-ovi su zato **novi** fajlovi, a moduli ostaju netaknuti.
