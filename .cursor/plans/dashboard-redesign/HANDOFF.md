# HANDOFF — Dashboard redesign

**Stanje:** **FAZA 1 (Dashboard pilot) ZAVRŠENA** — 2 commita, sve verifikovano. **Čeka review prije faze 2.**
**Grana:** `arena/d2af28f4-beauty-salon-v2` · **Bazni commit:** `9df498a`

> ⚠️ **D9 (error stanje + retry) NIJE implementiran.** Plan je tvrdio da dashboard danas
> prikazuje prazan ekran — **netačno**. Svih 8 `api.get()` u `use-dashboard-data.ts` ima
> `.catch()` fallback, pa `Promise.all` nikad ne odbija i dashboard **tiho prikazuje nule
> koje izgledaju stvarno**. Ispravka mijenja vidljivo ponašanje i dira fajl zakucan
> `dashboard-count-contract.test.mjs`. **Čeka odluku vlasnika** — detalji u
> [`CHANGELOG.md`](CHANGELOG.md), sekcija faze 1.

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
- **Q3 objedinjavanja M1/M2** — bez odobrenja se **ne implementiraju**; faze 6 i 10 imaju plan i za varijantu bez spajanja.
- **Q4 axe/Playwright** — bez toga **ne postoji rendered a11y dokaz** i sve WCAG stavke ostaju 🟡.

**Najveći rizik (R1):** u ovom okruženju nema preglednika, axe-a ni čitača ekrana.
Sve što napišem o WCAG-u biće označeno 🟡 „zadovoljeno u kodu, nije verifikovano u renderu“ — nikad ✅ bez dokaza.

## 4. Next steps (konkretno)

1. ~~Vlasnik odgovara na Q1–Q7 i daje „plan odobren“.~~ ✅ 2026-11-08
2. ~~**Faza 0 — Temelj**~~ ✅ 4 commita (`f14c786` → `71520ce`)
3. ~~**Faza 1 — Dashboard (pilot)**~~ ✅ 2 commita (`3aa3014`, `7056e17`)
4. **ODLUKA ZA D9** — implementirati error stanje + retry (mijenja vidljivo ponašanje i
   dira `use-dashboard-data.ts`) ili ostaviti kako jeste. Bez odgovora se ne dira.
5. **Faza 2 — Rezervacije (lista + kalendar)** → plan u
   [`05_phase-2-reservations.md`](05_phase-2-reservations.md). Najveći modul dosad:
   9 fajlova / 2440 ln / 8 testova, uključujući `ReservationScheduler.tsx` (1196 ln) s
   `react-big-calendar` i nedostatkom tastaturske alternative (2.5.7).
6. Dalje modul po modul, samo kad prethodni ispuni DoD.

## 5. Test status

Zadnji puni green run: **nakon faze 1** (`7056e17`).

| Šta | Rezultat | Kada |
|---|---|---|
| `frontend` build (`tsc -b` + vite + bundle budget) | **PASS** — 272.2 KiB gzip (budžet 300) | faza 1 |
| `test:*` skripte | **147/147 PASS** (baseline 142; +5 u fazama 0–1) | faza 1 |
| `check_i18n.py --strict` | **PASS** (2615/2615; baseline 2575) | faza 1 |
| `check_ui_contrast.py --strict` | **PASS** (80/80; baseline 44) | faza 1 |
| `check_repo_hygiene.py` | **PASS** (1648 pathova) | faza 1 |
| `check_doc_links.py` | **PASS** (669/202) | faza 1 |
| Backend testovi / migracije | **nije pokretano** — out of scope | — |
| Rendered / axe / screen-reader | **nije pokretano** — nema alata u okruženju | — |

Novi testovi iz faze 1: `test:dashboard-stat-parity` (6/6), `test:dashboard-states` (7/7),
`test:dashboard-a11y` (9/9) — sva tri u `package.json` **i** `.github/workflows/ci.yml`.

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
