# Daily Log Matrix

## Statusi

| Status | Opis |
|--------|------|
| PENDING | Unos na čekanju; stilista može uređivati/brisati (vlastiti), dodavati before/after slike |
| COMPLETED | Kompletiran; knjižen u KIF; javni before/after ako ima obje slike |
| DELETED | Soft-delete (`deletedAt != null`); isključen iz statistika i javne galerije |

## Ko šta smije

| Akcija | Stilista (vlastiti) | Admin/Owner |
|--------|---------------------|-------------|
| Kreirati unos | Da | Da |
| Urediti PENDING (cijena/napomena/datum/servisi/klijent) | Da (bez stiliste) | Da (sva polja) |
| Urediti COMPLETED | Ne | Da |
| Kompletirati | Da | Da |
| Vratiti COMPLETED → PENDING | Ne | Da |
| Soft delete PENDING | Da (razlog opcionalan) | Da (razlog obavezan) |
| Soft delete COMPLETED | Ne | Da (razlog obavezan) |
| Restore deleted | Ne | Da (vraća kao PENDING) |
| Dodati slike na PENDING | Da | Da |
| Dodati/obrisati slike na COMPLETED | Ne | Da |

## Prelazi i nuspojave

| Prelaz | KIF | Loyalty | Dugovanja | Rezervacija |
|--------|-----|---------|-----------|-------------|
| PENDING → COMPLETED | `IncomeBookEntry` + rekalkulacija totala | EARN bodovi | — | Ako vezana: → COMPLETED |
| COMPLETED → PENDING (revert) | Briše KIF stavku + totali | Reverzija EARN/REDEEM (clamp ≥ 0) | Reopen SETTLED via `sourceEntryId`; briše OPEN dug kreiran iz unosa | Ako COMPLETED → IN_PROGRESS |
| Soft delete COMPLETED | Isto kao revert | Isto | Isto | Isto |
| Soft delete DEBT_PAYMENT | Briše manual KIF | — | Dug → OPEN | — |
| Soft delete PENDING | — | — | Briše OPEN dug kreiran iz unosa | — |

## Pravila

- Zatvoren KIF mjesec (`IncomeBook.closedAt`) **blokira** brisanje, revert i izmjenu COMPLETED unosa.
- Javna galerija: `status=COMPLETED`, `deletedAt=null`, `kind=SERVICE`, ima `isBefore` i `isAfter` sliku.
- `sourceEntryId` povezuje DEBT_PAYMENT unose s izvornim SERVICE unosom.
- `IncomeBookManualEntry.dailyLogEntryId` povezuje ručnu KIF stavku s DEBT_PAYMENT unosom.
