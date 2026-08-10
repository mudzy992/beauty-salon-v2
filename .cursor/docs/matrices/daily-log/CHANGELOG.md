# Daily Log Matrix Changelog

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
