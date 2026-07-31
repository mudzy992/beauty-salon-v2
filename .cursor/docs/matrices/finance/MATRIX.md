# Finance Matrix (KIF/KUF)

Source of truth za knjige prihoda (KIF / `IncomeBook`), knjige rashoda (KUF / `ExpenseBook`) i klijentske dugove (`ClientDebt`).

## Lifecycle knjige

| Stanje | Uslov | Šta je dozvoljeno |
|--------|-------|-------------------|
| Otvorena | `closedAt = null` | Svi upisi: auto stavke iz dnevne knjige, ručne stavke, rashodi, naplata duga |
| Zaključana | `closedAt != null` | Samo čitanje, export i integrity provjera |

Prelazi:

| Prelaz | Ko | Trag |
|--------|-----|------|
| Otvaranje mjeseca (`GET month/:year/:month`) | SYSTEM_ADMIN, OWNER | Idempotentno — vraća postojeću knjigu |
| Otvaranje CRON-om (1. u mjesecu) | sistem | Otvara i KIF i KUF za novi mjesec |
| Zaključavanje (`POST :id/lock`) | SYSTEM_ADMIN, OWNER | `IncomeBookLockEvent` tip `LOCK` |
| Auto-zaključavanje prethodnog mjeseca | sistem (CRON) | `IncomeBookLockEvent` tip `LOCK`, `reason: 'AUTO_CLOSE'`, `createdById = null` |
| Otključavanje (`POST :id/unlock`) | SYSTEM_ADMIN, OWNER | `IncomeBookLockEvent` tip `UNLOCK`, **razlog obavezan** |

Buduće mjesece nije moguće otvoriti (`isFutureMonth`); zaključavanje budućeg perioda je odbijeno.

## Matrica dozvola

| Akcija | Endpoint | SYSTEM_ADMIN / OWNER | STYLIST |
|--------|----------|----------------------|---------|
| Pregled i otvaranje KIF knjiga | `api/income-books` | Da | Ne |
| Lock / unlock KIF | `POST :id/lock`, `POST :id/unlock` | Da | Ne |
| Ručne KIF stavke (CRUD) | `:id/manual-entries` | Da | Ne |
| Integritet i re-sync | `GET :id/integrity`, `POST :id/resync` | Da | Ne |
| Pregled i unos rashoda | `api/expenses`, `api/expense-books` | Da | Ne |
| Kategorije i predlošci | `api/expense-categories`, `api/expense-templates` | Da | Ne |
| Pregled vlastitih dugova klijenta | `GET api/client-debts` | Da | Da (vlastiti klijenti) |
| Naplata duga | `POST api/client-debts/:id/repay` | Da | Da |
| Otpis duga | `PATCH api/client-debts/:id/write-off` | Da | Ne |

## Pravila iznosa

| Pojam | Formula |
|-------|---------|
| `IncomeBookEntry.amount` | `dailyLogEntry.actualPrice - tipAmount` (prihod bez napojnice) |
| `IncomeBookEntry.tipAmount` | `dailyLogEntry.tipAmount` |
| Ručna stavka: baza | `min(paidAmount, servicePrice) - tipAmount` |
| Ručna stavka: napojnica | `max(0, paidAmount - servicePrice)` kada nije eksplicitno data |
| Ručna stavka: dug | `max(0, servicePrice - paidAmount)` uz `debtHandling: 'CREATE_DEBT'` |
| `IncomeBook.totalRevenue` | suma `amount` svih auto + ručnih stavki |
| `IncomeBook.totalTips` | suma `tipAmount` svih auto + ručnih stavki |
| Stvarno naplaćeno | `totalRevenue + totalTips` |
| `ExpenseBook.totalExpenses` | suma `Expense.amount` knjige |
| Neto mjeseca | `IncomeBook.totalRevenue - ExpenseBook.totalExpenses` |

`recalculateTotals(bookId, tx)` se **uvijek** poziva unutar iste transakcije kao i izmjena stavke — nikad nakon commita.

## Životni ciklus duga (`ClientDebt`)

| Status | Kako nastaje | Kako se zatvara |
|--------|--------------|-----------------|
| OPEN | Ručna KIF stavka sa `debtHandling: 'CREATE_DEBT'` i `debtAmount > 0`; dnevna knjiga sa nedoplatom | Naplata (`repay`) → SETTLED uz KIF stavku; otpis (`write-off`) → SETTLED bez KIF stavke |
| SETTLED | `repay` ili `write-off` | Terminalno; reopen samo revertom izvornog dnevnog unosa |

Sinhronizacija duga sa ručnom stavkom (`syncDebtForManualEntry`) je upsert unutar transakcije:

| Situacija | Rezultat |
|-----------|----------|
| Nema OPEN duga, `debtAmount > 0`, `CREATE_DEBT` | Kreira jedan dug |
| Postoji OPEN dug, `debtAmount > 0` | Ažurira iznos postojećeg (ne kreira drugi) |
| Postoji OPEN dug, `debtAmount = 0` ili `IGNORE_DEBT` | Briše dug |
| Brisanje ručne stavke | Briše vezani OPEN dug |
| Postoji SETTLED dug | Izmjena iznosa i brisanje stavke su **blokirani** (`BadRequestException`) |

Otpis (`write-off`) zahtijeva razlog od najmanje 3 znaka i ne knjiži prihod. Naplata (`repay`) kreira `IncomeBookManualEntry` i zato zahtijeva otvorenu knjigu za datum naplate.

## Šta blokira zaključana knjiga

Sve putanje idu kroz `IncomeSyncService.assertBookOpenForDate` odnosno `getEditableBookOrThrow`:

- `POST api/income-books/sync-from-daily-log/:id`
- Kompletiranje, revert i soft-delete dnevnog unosa (`daily-log.service`, `daily-log-reversal.service`, `daily-log-admin.service`)
- `POST api/client-debts/:id/repay`
- CRUD ručnih KIF stavki
- CRUD rashoda i priloga u zaključanoj KUF knjizi

## Integritet (drift detekcija)

`GET api/income-books/:id/integrity` vraća COMPLETED dnevne unose mjeseca koji nemaju odgovarajući `IncomeBookEntry`, plus razliku između sačuvanih i preračunatih totala. `POST api/income-books/:id/resync` dopunjava nedostajuće stavke i preračunava totale; radi samo na otvorenoj knjizi.

## Rashodi (KUF)

- `Expense` se unosi po kategoriji; kategorija nosi `ExpenseCategoryTemplate` sa poljima (`TEXT | NUMBER | CURRENCY | DATE | FILE`).
- Svako `fieldValues[].fieldId` mora pripadati predlošku te kategorije, bez duplikata, a sva `isRequired` polja moraju imati vrijednost (`assertFieldValuesMatchTemplate`).
- `create` i `update` idu kroz `prisma.$transaction` — pad na upisu polja ne ostavlja rashod bez obaveznih vrijednosti niti briše postojeće.
- Polje predloška koje je već korišteno u nekom rashodu ne može se obrisati.
- `requiresAttachmentPerItem` na predlošku znači da svaka stavka mora imati prilog.

## Backend struktura

| Fajl | Odgovornost |
|------|-------------|
| `finance/repositories/income-book.repository.ts` | Prisma upiti nad KIF knjigom + `recalculateTotals(bookId, tx)` |
| `finance/income-books.service.ts` | Lifecycle: open / lock / unlock / mjesečni roll |
| `finance/income-manual-entries.service.ts` | CRUD ručnih stavki + audit + debt sync |
| `finance/income-sync.service.ts` | Dnevna knjiga → KIF, `assertBookOpenForDate`, integritet, re-sync |
| `finance/client-debts.service.ts` | Naplata i otpis duga |
| `finance/expenses.service.ts` | Rashodi (transakcijski) + validacija polja predloška |
| `finance/income-cron.service.ts` | Mjesečni CRON (KIF + KUF), try/catch + logger |
| `common/utils/book-period.ts` | `isPastMonth`, `isFutureMonth`, normalizacija perioda |

## Frontend struktura

`frontend/src/features/finance/`: `api/` (HTTP pozivi), `hooks/` (TanStack Query, ključevi u `hooks/query-keys.ts`), `components/` (dijeljeno: `responsive-dialog`, `confirm-dialog`, `book-period-picker`, `book-lock-controls`, `summary-cards`, `export-menu`, `data-state`), `income/`, `expense/`, `catalog/`.

Pravila:

- Sve dohvaćanje ide kroz TanStack Query; nakon mutacije se invalidiraju hijerarhijski ključevi (`['finance','income-book', id]` …), bez ručnog refetch-a.
- Totali se **ne** računaju na frontendu — koriste se `totalRevenue` / `totalTips` / `totalExpenses` sa backenda. Frontend sumira samo filtrirani prikaz i to označava kao takav.
- Potvrde idu kroz `ConfirmDialog` (`window.confirm` je zabranjen); na mobilnom breakpointu dijalozi se renderuju kao drawer.
