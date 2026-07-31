---
name: Finance KIF KUF Overhaul
overview: Popraviti potvrđene bugove u finance modulu (dupli/orphan dugovi, zaobilaženje zaključane knjige, ne-transakcijski upisi, tihi catch), pooštriti validacije i indekse, refaktorisati backend i frontend na modularne fajlove, te dodati filtere/sort/export i TanStack Query u web admin.
todos:
  - id: debt-lifecycle
    content: "Fix duplih i orphan ClientDebt zapisa: syncDebtForManualEntry helper u update/delete putanjama ručnih KIF stavki"
    status: completed
  - id: locked-book
    content: Zatvoriti zaobilaženje zaključane knjige u sync-from-daily-log i repayDebt (assertBookOpenForDate)
    status: completed
  - id: silent-catch
    content: Ukloniti tihi catch u daily-log.service.ts:539, dodati logging i GET :id/integrity drift detektor
    status: completed
  - id: tx-totals
    content: recalculateTotals(bookId, tx?) unutar transakcije na sva 4 poziva + deduplikacija u client-debts.service.ts
    status: completed
  - id: tx-expenses
    content: ExpensesService create/update u prisma.$transaction
    status: completed
  - id: validation
    content: Validacija obaveznih polja predloška i pripadnosti fieldId, DTO za addField endpoint
    status: completed
  - id: schema-index
    content: "Migracija: @@index([bookId]) na Expense i @@index([templateId]) na ExpenseTemplateField"
    status: completed
  - id: cron-cleanup
    content: "CRON: try/catch + logger, LOCK event pri auto-close, otvaranje ExpenseBook; enum umjesto 'as any'; brisanje mrtvih DTO-a"
    status: completed
  - id: settle-semantics
    content: Razdvojiti semantiku otpisa duga (settle) od naplate (repay), obavezan razlog
    status: completed
  - id: backend-split
    content: Podjela income-books.service.ts (515 linija) na repository + lifecycle/manual-entries/sync servise + shared book-period util
    status: completed
  - id: backend-tests
    content: Testovi za debt lifecycle, locked-book guard, expense validacije, rollback i CRON idempotentnost
    status: completed
  - id: fe-structure
    content: Razbijanje income-books-tab.tsx (1054) i expense-books-tab.tsx (1563) na api/hooks/components/income/expense strukturu
    status: completed
  - id: fe-query
    content: Migracija na TanStack Query sa hijerarhijskim query ključevima i invalidacijom
    status: completed
  - id: fe-shared
    content: "Dijeljene komponente: lock-unlock-dialog, book-period-picker, money-cell, AlertDialog umjesto window.confirm; fix N+1 u kategorijama"
    status: completed
  - id: fe-features
    content: Filteri, sort, rekapitulacija, CSV/XLSX/PDF export, panel integriteta
    status: completed
  - id: fe-ux
    content: Mobile drawer, loading/empty/error stanja, a11y, i18n BS+EN
    status: completed
  - id: docs
    content: Kreirati .cursor/docs/matrices/finance/MATRIX.md + CHANGELOG.md, ažurirati finance-system.mdc i SKILL.md
    status: completed
isProject: false
---

# Refaktor i hardening finansijskog modula (KIF/KUF)

## Kontekst

Analiza je pokrila `backend/src/finance/**`, `backend/src/daily-log/**` i `frontend/src/features/finance/**`. PDV i sekvencijalna numeracija su van obima (odluka korisnika) — ostajemo na bruto iznosima.

---

## FAZA 1 — Kritični bugovi (backend)

### 1.1 Dupli i orphan `ClientDebt` (najkritičnije)

[backend/src/finance/income-books.service.ts](backend/src/finance/income-books.service.ts)

- `updateManualEntry` (linija 376-388) na **svaki** update sa `debtHandling: 'CREATE_DEBT'` radi `tx.clientDebt.create(...)`. Tri uzastopna save-a = tri OPEN duga za istu stavku.
- Ako korisnik poveća `paidAmount` tako da `debtAmount === 0`, postojeći dug ostaje OPEN — nikad se ne zatvara.
- `deleteManualEntry` (linija 409-430) briše stavku; `ClientDebt.manualEntryId` je `onDelete: SetNull`, pa dug ostaje OPEN i bez ikakve veze na izvor.

**Fix:** uvesti `syncDebtForManualEntry(tx, { entryId, ... })` helper koji unutar transakcije radi upsert semantiku:
- postojeći OPEN dug za `manualEntryId` → update iznosa, ili delete ako `debtAmount === 0` / `IGNORE_DEBT`
- SETTLED dug → ne dirati, ali blokirati izmjenu iznosa uz jasnu poruku
- kod `deleteManualEntry` → obrisati vezani OPEN dug, a SETTLED dug blokirati brisanje stavke

### 1.2 Zaobilaženje zaključane knjige

- `POST api/income-books/sync-from-daily-log/:id` → [income.controller.ts:80](backend/src/finance/income.controller.ts) poziva `addEntryFromDailyLog` koji **ne provjerava** `book.closedAt`. Upisuje u zaključanu knjigu.
- `ClientDebtsService.repayDebt` → [client-debts.service.ts:163](backend/src/finance/client-debts.service.ts) koristi `getOrCreateForMonth` umjesto `assertBookOpenForDate`, pa kreira `IncomeBookManualEntry` u zaključanoj knjizi.

**Fix:** oba puta koriste `assertBookOpenForDate`; `addEntryFromDailyLog` dobija provjeru `book.closedAt`.

### 1.3 Tihi catch — KIF desync

```539:539:backend/src/daily-log/daily-log.service.ts
    await this.incomeBooks.addEntryFromDailyLog(id).catch(() => {});
```

Zapis može biti COMPLETED bez KIF stavke, bez ikakvog traga. **Fix:** logovati kroz `Logger.error` sa `dailyLogEntryId`, i izbaciti grešku ako je uzrok zaključana knjiga (korisnik mora znati). Dodati `GET api/income-books/:id/integrity` koji vraća COMPLETED daily-log zapise mjeseca bez `IncomeBookEntry` (drift detektor).

### 1.4 `recalculateTotals` van transakcije

Pozivi na linijama 263, 391, 431, 477 u `income-books.service.ts` su **poslije** commit-a. Paralelni requestovi daju netačne `totalRevenue`/`totalTips`. `repayDebt` to već radi ispravno unutar `tx` (linija 212-227).

**Fix:** `recalculateTotals(bookId, tx?)` prima opcioni Prisma klijent i poziva se unutar `$transaction` na sva 4 mjesta; `client-debts.service.ts` prelazi na isti helper (uklanja dupliranu agregaciju).

### 1.5 Ne-transakcijski `ExpensesService`

```46:62:backend/src/finance/expenses.service.ts
    if (dto.fieldValues?.length) {
      await this.prisma.expenseFieldValue.createMany({ ... });
    }
```

`create` i `update` (linija 111-122, `deleteMany` pa `createMany`) nisu u transakciji — pad na `createMany` ostavlja rashod bez obaveznih polja, odnosno **trajno briše** postojeće vrijednosti.

**Fix:** obje operacije u `prisma.$transaction`.

---

## FAZA 2 — Validacije i integritet

- **Obavezna polja predloška se ne validiraju.** `ExpensesService.create` učitava `category.template.fields` (linija 25-28) ali ih nikad ne koristi; ostaje mrtvi `if` na liniji 30-32. Dodati provjeru `isRequired` polja i da svaki `fieldValues[].fieldId` pripada predlošku te kategorije (trenutno se može poslati bilo koji `fieldId`).
- **`POST api/expense-templates/:id/fields` nema DTO** ([expense-templates.controller.ts:44](backend/src/finance/expense-templates.controller.ts)) — `fieldType` je neograničen string. Dodati `CreateExpenseTemplateFieldDto` sa `@IsIn(['TEXT','NUMBER','CURRENCY','DATE','FILE'])`.
- **Nedostaje `@@index([bookId])` na `Expense`** — `findAll(bookId)` radi full scan. Migracija + index i na `ExpenseTemplateField.templateId`.
- **`status as any`** u [client-debts.service.ts:84](backend/src/finance/client-debts.service.ts) → koristiti `ClientDebtStatus` enum.
- **Mrtav kod:** `tipAmount` u `CreateIncomeBookManualEntryDto` (servis ga nikad ne čita) i `create-client-debt.dto.ts` (nema endpointa) — obrisati.
- **CRON bez zaštite:** [income-cron.service.ts](backend/src/finance/income-cron.service.ts) nema try/catch, ne piše `IncomeBookLockEvent` pri automatskom zaključavanju (rupa u auditu), i ne otvara `ExpenseBook`. Dodati try/catch + logger, `LOCK` event sa `reason: 'AUTO_CLOSE'`, i otvaranje KUF knjige.
- **`settle` vs `repay` nekonzistentnost:** `settle` (linija 102-122) zatvara dug **bez** KIF stavke — to je otpis, ne naplata. Preimenovati semantiku u UI/API kao "otpis duga" i tražiti obavezan razlog.

---

## FAZA 3 — Backend struktura

`income-books.service.ts` ima 515 linija (limit je 200). Prema [.cursor/rules/backend-architecture.mdc](.cursor/rules/backend-architecture.mdc) finance treba repository sloj.

Podjela:
- `finance/repositories/income-book.repository.ts` — Prisma upiti (`findOne` include blokovi, agregacije)
- `finance/income-books.service.ts` — samo lifecycle knjige (open/close/lock/unlock/CRON)
- `finance/income-manual-entries.service.ts` — CRUD ručnih stavki + audit + debt sync
- `finance/income-sync.service.ts` — `addEntryFromDailyLog`, `assertBookOpenForDate`, `recalculateTotals`, integrity check
- `common/utils/book-period.util.ts` — `isPastMonth` / `isFutureMonth` (trenutno duplirano u `income-books.service.ts:504-519` i `expense-books.service.ts:147-163`)

---

## FAZA 4 — Testovi (backend)

Novi/prošireni `*.spec.ts` za:
- update ručne stavke ne pravi drugi dug; smanjenje duga na 0 briše dug; brisanje stavke briše OPEN dug
- `sync-from-daily-log` i `repayDebt` odbijaju zaključanu knjigu
- `ExpensesService` odbija nedostajuće obavezno polje i strani `fieldId`
- rollback: pad na `createMany` ne ostavlja rashod bez polja
- `recalculateTotals` tačan sa mix auto + manual stavki
- CRON: dupli poziv je idempotentan, piše LOCK event

---

## FAZA 5 — Frontend refaktor

Trenutno stanje: `expense-books-tab.tsx` **1563 linije**, `income-books-tab.tsx` **1054 linije** — po jedna monolitna komponenta sa svim dijalozima i fetch logikom. **Nula** TanStack Query poziva u cijelom modulu.

Nova struktura pod `frontend/src/features/finance/`:

```
api/            income-books.api.ts, expense-books.api.ts, expense-categories.api.ts
hooks/          use-income-books.ts, use-income-book.ts, use-manual-entries.ts,
                use-expense-books.ts, use-expenses.ts, use-expense-categories.ts
components/     book-period-picker.tsx, book-lock-badge.tsx, lock-unlock-dialog.tsx,
                money-cell.tsx, book-totals-cards.tsx, confirm-dialog.tsx
income/         income-books-list.tsx, income-book-detail.tsx,
                manual-entry-dialog.tsx, manual-entry-table.tsx, audit-log-panel.tsx
expense/        expense-books-list.tsx, expense-book-detail.tsx,
                expense-dialog.tsx, expense-table.tsx, line-items-editor.tsx
```

Ključne izmjene:
- Migracija na `useQuery`/`useMutation` sa hijerarhijskim ključevima (`['finance','income-books']`, `['finance','income-book', id]`) i `invalidateQueries` umjesto ručnog refetch-a
- `formatMoney` u `finance.utils.ts` (trenutno `toFixed` raspršen po fajlovima)
- Ukloniti frontend re-kalkulaciju totala — koristiti `totalRevenue`/`totalTips`/`totalExpenses` sa backenda (rizik drift-a)
- `lock-unlock-dialog.tsx` dijeljen između KIF i KUF (sada dupliran)
- Zamijeniti sve `window.confirm` sa shadcn `AlertDialog`
- Fix N+1 u `expense-categories-tab.tsx` — backend `GET api/expense-templates` već vraća `fields`, koristiti to umjesto pojedinačnih poziva

---

## FAZA 6 — Frontend funkcionalnosti

- **Filteri i sort** na tabelama stavki: period/datum, stilista, servis, klijent, tip (auto/ručno), raspon iznosa; za rashode: kategorija, raspon iznosa, ima li prilog
- **Export CSV/XLSX** po knjizi (stavke + sumarni red) i **PDF** rekapitulacija mjeseca
- **Rekapitulacija** iznad tabele: prihod bez napojnice, napojnice, ukupno naplaćeno, rashodi, neto (KIF − KUF), broj stavki
- **Mobile**: `Sheet`/`Drawer` umjesto `Dialog` na `sm` breakpointu (globalno pravilo), horizontalno skrolabilne tabele sa sticky prvom kolonom
- **Loading/empty/error**: skeleton redovi, prazna stanja sa CTA, error state sa retry
- **A11y**: `aria-label` na akcijskim ikonama, focus trap u dijalozima, zamijeniti programske `input[type=file]` klikove pravim `<label htmlFor>`
- **Panel integriteta**: prikaz rezultata `GET :id/integrity` u detalju knjige (COMPLETED zapisi bez KIF stavke) sa dugmetom za re-sync
- **i18n**: `finance.*` ključevi u BS locale postoje ali se skoro ne koriste; EN je prazan stub. Prebaciti hardkodirane stringove (uklj. labele tabova u [finance-page.tsx:20-22](frontend/src/features/finance/finance-page.tsx)) na `t()` i popuniti EN

---

## FAZA 7 — Dokumentacija

`.cursor/docs/matrices/` trenutno ima samo `daily-log/`. Kreirati:
- `.cursor/docs/matrices/finance/MATRIX.md` — lifecycle knjige (open → lock → unlock), matrica dozvola po roli, pravila iznosa (`amount = actualPrice − tipAmount`), životni ciklus duga (OPEN → SETTLED / otpis), šta blokira zaključana knjiga
- `.cursor/docs/matrices/finance/CHANGELOG.md`
- Ažurirati [.cursor/rules/finance-system.mdc](.cursor/rules/finance-system.mdc) (13 linija, ne pominje lock/unlock, ručne stavke ni dugove) i [.cursor/skills/finance-operations/SKILL.md](.cursor/skills/finance-operations/SKILL.md)
