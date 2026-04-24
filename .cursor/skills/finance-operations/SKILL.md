# Skill: Finance Operations

Koristi se za rad sa KIF/KUF sistemom i dnevnom knjigom.
Sve operacije moraju koristiti Repository layer i pratiti backend-architecture.mdc pravila.

## Kad koristiti
- Unos rashoda po kategoriji i templateu, knjige rashoda/prihoda.
- CRON za otvaranje/zatvaranje mjesečnih knjiga.
- Agregacija iz daily_log u income_books.

## Šta raditi
1. **KUF**: Kreiraj expense po kategoriji; popuni expense_field_values iz templatea kategorije. Prilozi preko expense_attachments. Knjiga rashoda: otvorena na početku mjeseca, zaključavanje ručno.
2. **KIF**: Income book entries iz daily_log_entries (status COMPLETED). CRON: 1. u mjesecu otvori novu income/expense knjigu, zatvori prethodnu (income automatski, expense po pravilima).
3. **Dnevna knjiga**: Automatski unos iz rezervacija (kad stilist označi COMPLETED) ili ručni unos; actualPrice, tipAmount, slike before/after.

## Reference
- `.cursor/rules/finance-system.mdc`
- `backend/prisma/schema.prisma` (ExpenseBook, IncomeBook, DailyLogEntry, ExpenseCategoryTemplate)
