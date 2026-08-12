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
| Soft delete PENDING | Da (razlog obavezan) | Da (razlog obavezan) |
| Soft delete COMPLETED | Ne | Da (razlog obavezan) |
| Restore deleted | Ne | Da (vraća kao PENDING) |
| Dodati slike na PENDING | Da | Da |
| Dodati/obrisati slike na COMPLETED | Ne | Da |

## Prelazi i nuspojave

| Prelaz | KIF | Loyalty | Dugovanja | Rezervacija |
|--------|-----|---------|-----------|-------------|
| PENDING → COMPLETED | `IncomeBookEntry` + rekalkulacija totala | EARN bodovi | — | Ako vezana: → COMPLETED | Push `payment_receipt` klijentu; email potvrda uplate ako je mail verifikovan |
| COMPLETED → PENDING (revert) | Briše KIF stavku + totali | Reverzija EARN/REDEEM (clamp ≥ 0) | Reopen SETTLED via `sourceEntryId`; briše OPEN dug kreiran iz unosa | Ako COMPLETED → IN_PROGRESS |
| Soft delete COMPLETED | Isto kao revert | Isto | Isto | Isto |
| Soft delete DEBT_PAYMENT | Briše manual KIF | — | Dug → OPEN | — |
| Soft delete PENDING | Reverzija linked DEBT_PAYMENT (KIF manual) | — | SETTLED via `sourceEntryId` → OPEN; briše OPEN dug kreiran iz unosa | — |

## Pravila

- Zatvoren KIF mjesec (`IncomeBook.closedAt`) **blokira** brisanje, revert i izmjenu COMPLETED unosa.
- Javna galerija: `status=COMPLETED`, `deletedAt=null`, `kind=SERVICE`, ima `isBefore` i `isAfter` sliku.
- `sourceEntryId` povezuje DEBT_PAYMENT unose s izvornim SERVICE unosom.
- Povezani `DEBT_PAYMENT` (sa `sourceEntryId`) **ne prikazuju se** kao zasebni unosi u listi dnevne knjige — sastavni su dio parent SERVICE unosa (vidljivi u detalju / kolonama dugovi). Samostalna manuelna naplata duga (bez `sourceEntryId`) ostaje zaseban unos.
- Svaki unos ima `publicReferenceCode` (`DK-YYYYMMDD-XXXXXX`) — naslov u UI.
- `IncomeBookManualEntry.dailyLogEntryId` povezuje ručnu KIF stavku s DEBT_PAYMENT unosom.

## Novac (konvencija)

| Pojam | Polje / formula | Primjer (servis 60, plaćeno 70) |
|-------|-----------------|--------------------------------|
| Ukupan prihod / naplaćeno | `actualPrice` | 70 |
| Napojnica | `tipAmount` | 10 |
| Prihod od servisa | `actualPrice - tipAmount` | 60 |
| KIF `IncomeBookEntry.amount` | = prihod od servisa (bez tipa) | 60 |
| KIF `IncomeBookEntry.tipAmount` | = napojnica | 10 |
| Knjiga `totalRevenue + totalTips` | = stvarno naplaćeno | 70 |

Admin UI (Dnevna knjiga): default filter = tekući kalendarski mjesec (1. → danas). Statistike sumiraju aktivne (ne-obrisane) PENDING + COMPLETED unose.

## Nova matrica cijena (v. client-debts)

- Stavke snimaju `DailyLogEntryServiceItem.unitPrice` (snapshot).
- Za naplatu = suma unitPrice − loyalty (+ odabrani OPEN dugovi).
- Naplaćeno default = Za naplatu; tip / shortfall + toggle Zavedi dug.
- Detalji: `.cursor/docs/matrices/client-debts/MATRIX.md`. KUF N/A.
