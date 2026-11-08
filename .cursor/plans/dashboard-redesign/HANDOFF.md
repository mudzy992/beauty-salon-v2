# HANDOFF — Dashboard redesign

**Stanje:** **FAZA 0 (Temelj) ZAVRŠENA** — 4 commita, sve verifikovano. **Čeka review prije faze 1.**
**Grana:** `arena/d2af28f4-beauty-salon-v2` · **Bazni commit:** `9df498a`

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

1. Vlasnik odgovara na Q1–Q7 i daje „plan odobren“.
2. **Faza 0 — Temelj**, redoslijed commit-ova iz [`03_phase-0-foundation.md` §9](03_phase-0-foundation.md):
   1. tokeni + `check_ui_contrast.py` proširenje
   2. shell (skip link, landmark-i, `aria-current`, naslovi, focus-on-navigate)
   3. primitivi (admin-scoped varijante button/input/badge/dropdown + OTP `autocomplete`)
   4. šabloni (PageHeader, FilterBar, DataTable, StatCard, FormSection, data states, ConfirmDialog)
3. **STOP** → izvještaj po `B3` formatu → pregled.
4. **Faza 1 — Dashboard (pilot)** → **STOP** → pregled.
5. Dalje modul po modul, samo kad prethodni ispuni DoD.

## 5. Test status

| Šta | Rezultat | Kada |
|---|---|---|
| `frontend` build (`tsc -b` + vite + bundle budget) | **PASS** | 2026-11-08, ETAPA A |
| 142 `test:*` skripte | **142/142 PASS** (412 asertacija) | 2026-11-08, ETAPA A |
| `check_i18n.py --strict` | **PASS** (2575/2575) | 2026-11-08 |
| `check_ui_contrast.py --strict` | **PASS** (44/44) | 2026-11-08 |
| `check_repo_hygiene.py` | **PASS** | 2026-11-08 |
| `check_doc_links.py` | **PASS** (622/180) | 2026-11-08 |
| Backend testovi / migracije | **nije pokretano** — out of scope za ETAPU A | — |
| Rendered / axe / screen-reader | **nije pokretano** — nema alata u okruženju | — |

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
