# Daily Log Matrix Changelog

## 2026-11-08 (a11y i tokeni — bez promjene poslovne logike)

**`MATRIX.md` namjerno NIJE mijenjan.** Ove izmjene su isključivo prezentacijske
i pristupačne; nijedan status, prelaz, dozvola ni izračun iznosa nije dirnut.
Potvrda: `features/daily-log/amounts.ts` ima **nula diff-a**, a `entry-status-label.ts`,
`types.ts`, `use-daily-log-data.ts`, `use-daily-log-mutations.ts`, `form-helpers.ts`
i `use-daily-log-form.ts` su netaknuti.

- **Client i service picker postali combobox (WCAG 2.1.1).** Prije: `<li>` opcije su imale
  `onClick` ali **ni `tabIndex`, ni `role`, ni `onKeyDown`** — tastaturni korisnik nije mogao
  izabrati klijenta ni servis. Sada: `role="combobox"` + `aria-expanded` + `aria-controls` +
  `aria-activedescendant` na inputu, `role="listbox"` + `role="option"` + `aria-selected` na
  opcijama, i rukovanje strelicama/Home/End/Enter/Escape. Service picker je
  `aria-multiselectable` s `aria-selected` iz `form.serviceIds`.
  **Mouse ponašanje je nepromijenjeno** — `onClick` i `onMouseDown preventDefault` su ostali.
- **12 `htmlFor` ↔ `id` parova** (bilo 4) + `role="group"`/`aria-labelledby` za grupu cijena
  servisa i loyalty sekciju čiji je `Input` uslovan.
- **Tabela**: `<caption className="sr-only">` (novi ključ `dailyLog.table.caption`) i
  `scope="col"` na svih 12 `<th>` (bilo 0 i 0).
- **1.4.11**: `text-slate-400` ikone → `text-content-muted` (2.56 → 5.61:1); `<select>` okviri
  `border-slate-200` (1.23:1) → `border-input-border` (4.24:1 u `.admin-shell`).
- **1.4.4**: 5× `text-[10px]` → `text-xs`. **1.4.3**: 48 zamjena sirovih paletnih klasa → tokeni.
- Novi test `test:daily-log-form-a11y` (14 asertacija) + CI korak.

**Neprovjereno izvršavanjem:** tastatursko ponašanje comboboxa. Test čita izvor i provjerava
*ožičenje* (poklapanje `aria-activedescendant` prefiksa s `id` opcije, pokrivenost tipki,
`preventDefault`), ali **ne renderuje** komponentu — cijeli modul testira regex-čitanjem.
Prava potvrda dolazi s Playwright/axe u fazi 13.

## 2026-08-19 (smart restore)

- Restore DELETED zapisa sada podržava odabir datuma (originalni ili novi) u dijalogu.
- Logika grananja: `isManual=true` ili prošli datum → PENDING; `isManual=false` + rezervacija + budući datum → nova rezervacija s nasljeđenim policyem (acceptanceMode, attendancePolicy, bookingOrigin).
- DIRECT_ASSIGN restore → nova rezervacija CONFIRMED+STAFF_WAIVED; INBOX restore → PENDING flow.
- Backend: `DailyLogRestoreService` (odvojen iz `DailyLogAdminService`); DTO `RestoreDailyLogEntryDto { date?: string }`.
- Frontend: `EntryRestoreDialog` s radio izborom datuma + info poruka za rezervacioni path.

## 2026-08-12 (payment receipt on complete)

- PENDING → COMPLETED: klijent dobija push/in-app `payment_receipt`; email potvrda uplate (receipt styling) samo ako je `isEmailVerified`.
- Walk-in (bez rezervacije): i dalje push/email; deep link na detalj samo kad postoji `reservationId`.
- Klijentski UI (mobile + web): detalj rezervacije prikazuje `paymentSummary` iz proknjiženog SERVICE zapisa.

## 2026-08-11 (admin detail dialog)

- Admin web dnevna knjiga: Eye → read-only detail dialog/drawer (ref, meta, lista servisa + unitPrice, naplata dugova, iznosi, bilješke).
- KIF knjiga prihoda: `dailyLogEntry.items` u detail include; kolona Servis prikazuje sve servise (stacked), ne samo legacy `service`.

## 2026-08-10 (reference + debt display)

- `publicReferenceCode` na DailyLogEntry (`DK-YYYYMMDD-XXXXXX`); backfill postojećih.
- Lista/detalj: više servisa, linked debt payments + ukupno naplaćeno (servisi + dugovi).
- Soft delete: razlog obavezan i za stilistu.
- Soft delete PENDING SERVICE: reverse linked DEBT_PAYMENT + reopen SETTLED dugova (`sourceEntryId`).
- Lista dnevne knjige: skriva DEBT_PAYMENT sa `sourceEntryId` (manuelna naplata duga ostaje vidljiva).

## 2026-08-10

- Nova matrica: `unitPrice` snapshot, Za naplatu / Naplaćeno, tip vs shortfall + Zavedi dug; settle OPEN dugova u istoj formi; vidi `client-debts` matricu. KUF N/A.

## 2026-07-31 (amounts / admin UI)

- Konvencija novca: `actualPrice` = ukupno naplaćeno (tip uključen); prihod od servisa = `actualPrice - tipAmount`.
- KIF auto stavke: `IncomeBookEntry.amount` = prihod od servisa (bez tipa); data-fix migracija `fix_income_book_entry_amount_excludes_tip`.
- Admin Dnevna knjiga: default filter tekući mjesec; kartice Ukupan / Servisi / Napojnice / Kompletirano; tabela Cijena + Napojnica + Ukupno.

## 2026-07-31

- Inicijalna matrica: PENDING / COMPLETED / DELETED soft-delete.
- Soft delete + puna reverzija KIF/loyalty/dugovanja/rezervacije.
- Veze `sourceEntryId` i `IncomeBookManualEntry.dailyLogEntryId` za otplate duga.
- Admin može uređivati sva polja i status; stilista samo PENDING (bez stiliste).
- Javni before/after filtrira na DB nivou (obje slike), `random` param.
