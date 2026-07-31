# Daily Log Matrix Changelog

## 2026-07-31

- Inicijalna matrica: PENDING / COMPLETED / DELETED soft-delete.
- Soft delete + puna reverzija KIF/loyalty/dugovanja/rezervacije.
- Veze `sourceEntryId` i `IncomeBookManualEntry.dailyLogEntryId` za otplate duga.
- Admin može uređivati sva polja i status; stilista samo PENDING (bez stiliste).
- Javni before/after filtrira na DB nivou (obje slike), `random` param.
