## 2026-08-11 (Modularne kategorije rashoda)

- Category-centric admin wizard (template ispod haube).
- `ExpenseTemplateField.lineRole` (LABEL|QTY|UNIT_PRICE|AMOUNT|NONE).
- Varijabilni redovi: notes JSON `v:2` + legacy adapter za `{name,qty,price}`.
- `POST api/expense-templates/bootstrap-legacy-columns` za Materijal bez kolona.
- Dinamički `LineItemsEditor` iz template polja; knjiga uključuje `category.template.fields`.

## 2026-08-11 (Expense categories AS-IS snapshot + modular plan)

- Dodat `EXPENSE_CATEGORIES_AS_IS.md` (rollback tačka).
- MATRIX: KUF sekcija ažurirana za modularne kolone (`lineRole`, notes `v:2`, category-centric admin).

## 2026-08-11 (KIF multi-servis prikaz)

- `IncomeBookRepository.findDetail`: include `dailyLogEntry.items.service`.
- Web knjiga prihoda: kolona Servis lista svih servisa iz dnevnog zapisa (fallback na legacy `service`).

## 2026-07-31 (restore fixed vs invoice expense modes)

- Vraćen model: `isFixed` kategorija (doprinosi) koristi template polja + `defaultValue` i opcionalno prilog po polju (`requiresAttachmentPerItem`).
- Nefiksna kategorija (materijal) koristi JSON `lineItems` u notes i prilog na cijeli rashod (ili po liniji ako je flag uključen).
- Backend forsira obavezna template polja samo za `isFixed` kategorije.


Backend — ispravke:

- `syncDebtForManualEntry`: update ručne stavke više ne kreira drugi OPEN dug, spuštanje duga na 0 ga briše, brisanje stavke briše vezani OPEN dug. SETTLED dug blokira izmjenu iznosa i brisanje stavke.
- Zaključana knjiga se više ne može zaobići: `sync-from-daily-log` i `ClientDebtsService.repayDebt` idu kroz `assertBookOpenForDate`.
- Uklonjen tihi `catch(() => {})` u `daily-log.service.ts` — greška se loguje i propagira.
- `recalculateTotals(bookId, tx)` se poziva unutar transakcije na svim mjestima; uklonjena duplirana agregacija iz `client-debts.service.ts`.
- `ExpensesService.create/update` su transakcijski.

Backend — validacije i integritet:

- `assertFieldValuesMatchTemplate`: obavezna polja predloška, pripadnost `fieldId` predlošku kategorije, bez duplikata.
- `CreateExpenseTemplateFieldDto` za `POST api/expense-templates/:id/fields`; polje koje je u upotrebi se ne može obrisati.
- Indeksi: `Expense(bookId, createdAt)`, `Expense(categoryId)`, `ExpenseTemplateField(templateId, sortOrder)`, `ClientDebt(manualEntryId, status)`.
- CRON: try/catch + logger, `LOCK` event sa `reason: 'AUTO_CLOSE'`, otvara i KUF knjigu; `IncomeBookLockEvent.createdById` je sada nullable (`onDelete: SetNull`).
- `ClientDebtStatus` enum umjesto `status as any`; obrisani mrtvi DTO-i (`create-client-debt.dto.ts`, `tipAmount` u manual entry DTO-ima).

Semantika duga:

- `PATCH api/client-debts/:id/settle` → **`PATCH api/client-debts/:id/write-off`** (otpis, bez knjiženja prihoda), razlog obavezan (min 3 znaka).
- Naplata ostaje `POST api/client-debts/:id/repay` i knjiži `IncomeBookManualEntry`.

Struktura:

- `income-books.service.ts` (515 linija) podijeljen na `repositories/income-book.repository.ts`, `income-books.service.ts` (lifecycle), `income-manual-entries.service.ts`, `income-sync.service.ts`; `isPastMonth`/`isFutureMonth` izdvojeni u `common/utils/book-period.ts`.
- Novi endpointi `GET api/income-books/:id/integrity` i `POST api/income-books/:id/resync`.

Frontend:

- `income-books-tab.tsx` (1054) i `expense-books-tab.tsx` (1563) razbijeni na `api/` + `hooks/` + `components/` + `income/` + `expense/` + `catalog/`.
- Migracija na TanStack Query sa hijerarhijskim ključevima i `invalidateQueries`; uklonjeni ručni refetch-evi.
- Dijeljene komponente: `responsive-dialog` (drawer na mobilnom), `confirm-dialog` (zamjena za `window.confirm`), `book-period-picker`, `book-lock-controls`, `summary-cards`, `export-menu`, `data-state` (skeleton / empty / error).
- Filteri i sort na stavkama, rekapitulacija, CSV export i PDF rekapitulacija, panel integriteta sa re-sync akcijom.
- Uklonjena frontend re-kalkulacija totala knjige; N+1 u kategorijama riješen korištenjem `fields` iz `GET api/expense-templates`.
- i18n: `finance.*` ključevi popunjeni za BS i EN.
