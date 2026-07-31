# Skill: Finance Operations

Rad sa KIF/KUF sistemom, klijentskim dugovima i vezom prema dnevnoj knjizi.

## Kad koristiti

- Unos rashoda po kategoriji i predlošku, knjige rashoda/prihoda.
- Ručne KIF stavke, naplata i otpis klijentskih dugova.
- CRON za otvaranje/zatvaranje mjesečnih knjiga.
- Agregacija iz `daily_log` u `income_books` i otklanjanje drift-a.

## Šta raditi

1. **Prije bilo kakvog upisa** provjeri da knjiga nije zaključana: `IncomeSyncService.assertBookOpenForDate(date)` za KIF putanje, `getEditableBookOrThrow(bookId)` za operacije nad konkretnom knjigom. Zaključana knjiga = read-only.
2. **KIF auto stavke**: iz `daily_log_entries` sa statusom COMPLETED, kroz `IncomeSyncService.addEntryFromDailyLog`. `amount` je prihod bez napojnice, `tipAmount` odvojeno. Greške sinhronizacije logovati i propagirati, ne gutati.
3. **KIF ručne stavke**: `IncomeManualEntriesService` (create/update/remove). Dug se sinhronizuje isključivo kroz `syncDebtForManualEntry` unutar iste transakcije — nikad direktan `clientDebt.create` u update putanji.
4. **Totali**: `recalculateTotals(bookId, tx)` unutar transakcije koja mijenja stavku. Ne pozivati nakon commita i ne računati totale na frontendu.
5. **Dugovi**: naplata → `repayDebt` (kreira ručnu KIF stavku, traži otvorenu knjigu); otpis → `writeOff` (bez prihoda, obavezan razlog min 3 znaka). SETTLED dug je terminalan.
6. **KUF**: rashod po kategoriji, `expense_field_values` validiraj kroz `assertFieldValuesMatchTemplate` (obavezna polja + pripadnost `fieldId` predlošku). `create`/`update` u `prisma.$transaction`.
7. **CRON**: 1. u mjesecu otvara KIF i KUF za novi mjesec i zaključava prethodni KIF uz `IncomeBookLockEvent` (`reason: 'AUTO_CLOSE'`). Mora biti idempotentan i u try/catch sa logovanjem.
8. **Drift**: `GET api/income-books/:id/integrity` za detekciju, `POST api/income-books/:id/resync` za popravku otvorene knjige.

## Frontend

`features/finance/{api,hooks,components,income,expense,catalog}`. Novi pozivi idu u `api/`, izlažu se kroz hook u `hooks/` sa ključem iz `query-keys.ts`, a mutacije invalidiraju odgovarajući hijerarhijski ključ. Dijalozi koriste `ResponsiveDialog` (drawer na mobilnom) i `ConfirmDialog` za potvrde.

## Reference

- `.cursor/docs/matrices/finance/MATRIX.md` — puna matrica (lifecycle, dozvole, iznosi, dugovi)
- `.cursor/rules/finance-system.mdc`
- `backend/prisma/schema.prisma` (`IncomeBook`, `IncomeBookManualEntry`, `ClientDebt`, `ExpenseBook`, `ExpenseCategoryTemplate`)
