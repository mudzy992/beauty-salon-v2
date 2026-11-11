# S7 — Admin operativa: Dnevna knjiga, Finansije, Lojalnost

**Status:** 🟡 čeka odobrenje S6 · **Finansijski proračuni su najstroži paritetni ugovor.**

---

## 1. Cilj

Refaktor tri operativna modula prema NEJRA §05/§09/§11, uključujući KIF/KUF, knjige prihoda/rashoda, katalog kategorija, dužnike (već redirect u Finance) i loyalty. **Nulta promjena iznosa, KIF/KUF proračuna, dugovanja, loyalty bodova, sortiranja, paginacije i formata.**

---

## 2. Ulaz

S6 završen (5/5); novi `DataTable`/`DataState`/`ConfirmDialog`/`StatCard` već u upotrebi; odobrena (ili odbijena) zamjena `window.confirm`; NEJRA §09 ima retke za ova 3 modula.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/pages/DailyLog.tsx`, `features/daily-log/*` | **IZMJENA** — lista, detalj, forma, create/edit drawer, restore/delete |
| `frontend/src/pages/Finance.tsx`, `features/finance/*` | **IZMJENA** — KIF/KUF, knjige, katalog, dužnici; postojeće `components/*` (`data-state`, `confirm-dialog`, `responsive-dialog`, `summary-cards`) **konsolidovati** s novim primitivama, ne praviti paralelne |
| `frontend/src/pages/Loyalty.tsx`, `features/loyalty/*` | **IZMJENA** — pregled bodova/nivoa/popusta |
| `frontend/src/pages/Debtors.tsx` | **BEZ IZMJENE** (ruta je već `<Navigate to="/admin/finance?tab=debtors" replace />`) |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — paritet |

---

## 4. Ugovor

- **Finansije:** `test:finance-summary-parity`, `test:daily-log-amount-parity`, `test:amount-format-consistency` su tvrdi gateovi. Isti zbiri, isti KIF/KUF resync, isto otvaranje knjiga, isti sort-direction, isti expense upload recovery, ista paginacija kategorija, isti `queryKeys`.
- **Dnevna knjiga:** isti `reservation/service` unique ugovor, isti iznos/napojnica, iste before/after slike i oba gallery moda, isti restore/delete, isti create/edit drawer s `DialogTitle`/`DialogDescription` (i u mobilnoj Radix varijanti), isti `fieldset/legend` i `3.3.7`.
- **Loyalty:** isti bodovi, nivoi, popusti i njihov odraz na naplatu; bez novih pravila.
- `3.3.4 Error prevention`: potvrda / pregled prije brisanja, poništenja i finansijskih akcija; `ConfirmDialog` s fokus-povratkom ako je zamjena odobrena, inače postojeći mehanizam ostaje.
- `4.1.3`: rezultati filtera, brojači, učitavanje/greške kroz `role="status"` / `role="alert"`, bez otimanja fokusa.
- Bez novih zavisnosti; bez diranja `/backend` (KIF/KUF logika je tamo).

---

## 5. Koraci

1. `DailyLog`: migracija na nove primitive; zadržati `workbook`/`daily-log` i18n ključeve, `aria-sort`, nazive akcija, `DialogTitle` u oba drawer moda, `role="status"` za loading, retry za grešku, `fieldset` za formu, `aria-describedby`/`aria-invalid`.
2. `Finance`: **konsolidacija** postojećih `features/finance/components/*` s novim `features/shell/aurum/ui/*` (jedan `DataState`, jedan `ConfirmDialog`, jedan `SummaryCard` uz `StatCard`); ne duplicirati. Zadržati KIF/KUF tabove, `?tab=debtors` deep-link, katalog kategorija s paginacijom, expense line-item editor (`useId` ID-jevi, `Label` povezan s kontrolom), `ResponsiveDialog` Radix semantiku i u mobilnom draweru.
3. `Loyalty`: `StatCard` + `DataTable` + `StatusBadge`; tekst uz svaku boju; grafikon (ako postoji) dobija tekstualni sažetak + tabelu podataka kao alternativu (1.1.1 / 1.4.1) i legendu s dovoljnim kontrastom.
4. Aurum: tamna radna površina, zlato samo za primarnu akciju, serifni naslovi sekcija; sve kroz tokene.
5. Ako je odobreno: `window.confirm` → `ConfirmDialog` u ova 3 modula, **ista poruka / isti uvjet / isti efekat**, uz upis u `CHANGELOG.md` i fokus-povratak na okidač.

---

## 6. Testovi

Zadržati zelenima (ažurirati uz obrazloženje): `test:daily-log-list-i18n`, `test:daily-log-table-i18n`, `test:daily-log-dialog-accessibility`, `test:daily-log-detail-i18n`, `test:daily-log-restore-delete-i18n`, `test:daily-log-form-i18n`, `test:daily-log-form-a11y`, `test:daily-log-amount-parity`, `test:finance-summary-parity`, `test:finance-table-a11y`, `test:admin-loyalty-i18n`, `test:loyalty-a11y`, `test:amount-format-consistency`, `test:workbook-form-groups-a11y`, `test:redundant-entry-a11y`, `test:workbook-loading-status-a11y`, `test:generic-aria-and-row-actions`, `test:data-table-consistency`, `test:theme-ssot-sync`.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + `npm run build` (pratiti `Finance` chunk 98,40 KiB / `DailyLog` 49,24 KiB baseline) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**; `backend` posao (DB-backed HTTP + Jest) ostaje zelen jer se API ne dira; `a11y-e2e` pokriva finance/daily-log rute.

---

## 8. DoD + dokazi

- ✅ 3 modula u 3 stanja; `finance-summary-parity`, `daily-log-amount-parity`, `amount-format-consistency` zeleni = **nijedan iznos nije promijenjen**.
- ✅ Konsolidovane komponente (nema paralelnih `DataState`/`ConfirmDialog`); `?tab=debtors` radi.
- ✅ Svi navedeni testovi zeleni; BS/EN paritet; build u budžetu; CI 5/5; evidencija ažurirana.
- 🟡 Rendered grafikon/legenda u čitaču ekrana → S11.
- **STOP** → „Odobravaš li S8 (Analitika, Korisnici, Salon, Usluge, Frizeri)?"

---

## 9. Rizici / pitanja

- **Najveći rizik:** konsolidacija `finance/components/*` može slučajno promijeniti redoslijed `role="status"` poruka; `test:finance-table-a11y` i `test:workbook-loading-status-a11y` to hvataju — ako padnu, vraća se tačan ugovor, ne ublažava test.
- Ako novi `StatCard` traži drugačiji oblik `finance` summary payload-a → **STOP** (API ugovor).
- Recharts legenda: `test:stylist-analytics-tables-a11y` i `test:text-contrast-allowlist` već imaju mjere; ne oslabljivati ih.
- Ne izmišljati nove kategorije rashoda, nova pravila bodova ni nove statuse duga.
