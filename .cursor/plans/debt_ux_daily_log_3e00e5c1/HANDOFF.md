# HANDOFF — Dugovanja + dnevna knjiga UX (nova matrica)

**Datum:** 2026-08-11  
**Plan:** `.cursor/plans/debt_ux_daily_log_3e00e5c1.plan.md` (ne uređivati plan file bez ownera)  
**Matrice:** `.cursor/docs/matrices/client-debts/`, `.cursor/docs/matrices/daily-log/`

---

## Status

Plan iz prvog prolaza je **implementiran**. Naknadni live-feedback UX/bugfixovi takođe (ref kod, multi-servis + dugovi u UI, delete reason, reopen dugova, edit route).  
**Prije nove sesije:** deploy/migrate `20260810160000_daily_log_public_reference_code` (+ ranija `20260810120000_daily_log_unit_price_and_pay_debts_intent` ako nije).

---

## Šta je urađeno

### Backend
- `DailyLogEntryServiceItem.unitPrice` + migracija backfill iz `services.price`
- `Reservation.payDebtsIntent`
- Pricing helpers: `daily-log.pricing.ts` (+ unit testovi)
- Create/update/from-reservation: chargeBase iz unitPrices − loyalty; tip/shortfall; CREATE_DEBT = shortfall; settle OPEN dugova u istoj formi
- Settle: kreira linked `DEBT_PAYMENT` (`sourceEntryId`) + KIF manual; **lista** skriva te redove (ostaju samo standalone manuelne naplate)
- Soft delete: **razlog obavezan** (stilista + admin); PENDING SERVICE → `reverseLinkedDebtPayments` → dugovi nazad u **OPEN**
- `GET /api/client-debts/me` + self-access u `listForClient`
- Notifikacija tip `client_debt` na CREATE_DEBT
- `publicReferenceCode` na `DailyLogEntry` (`DK-YYYYMMDD-XXXXXX`) + backfill migracija; generate na create / debt payment / repay

### Web
- Daily log forma: editabilne cijene, Za naplatu/Naplaćeno, Zavedi dug, Naplati dug linije (`pricing-panel`, `use-daily-log-form`)
- Admin tabela: Ref, multi-servis label, kolone Dugovi / Ukupno (servisi+dugovi)
- Public reserve + stylist portal complete: `payDebtsIntent` / nova matrica (bez partial dijaloga)
- Stylist workbook list/detail: ref, servisi, dugovi, ukupno

### Mobile
- Novi unos: lista servisa + edit/delete ikone; cijena u dijalogu; jače **Naplati dug** + hint “Označite dugovanja…”
- Detail/list: ref naslov, lista servisa, naplata dugovanja, ukupno
- Delete modal sa razlogom
- Fix: `reactNavAdapter` šalje `entryId` na `DailyLogNewEntry`
- Client: profil OPEN dugovi, home banner, booking checkbox “Plaćam i dugovanje”

---

## Donesene odluke

| Odluka | Razlog |
|--------|--------|
| Linked DEBT_PAYMENT ostaje u DB/KIF, ali **nije** zaseban red u listi | Audit + KIF; UX “sastavni dio” parent unosa |
| `actualPrice` SERVICE = samo dio za servise; dugovi = child actualPrice | Tip/shortfall vs chargeBase servisa; dugovi puni iznos |
| UI **Ukupno** = `actualPrice + sum(debtPaymentEntries)` | Live case 7+7=14 |
| Soft delete razlog obavezan i za stilistu | Owner UX zahtjev |
| KUF bez izmjena | Plan van obima |

---

## Otvorena pitanja / rizici

1. **Migracije na live** — potvrdi da su obje migracije deployane; bez `public_reference_code` create pada.
2. **Stari PENDING unos** (test 7+7) — nakon deploya detail treba pokazati `debtPaymentEntries` ako je settle uspio; ako nije, re-test create.
3. **Uredi unos** sa već settled dugovima — edit forma ne re-settle-a dugove (settle UI sakriven u editMode); paid se učitava kao services+debts sum (display), PATCH i dalje šalje service-side — paziti da edit ne pokvari iznose.
4. **Workbook new-entry** web možda još nije 1:1 sa novom matricom (admin/mobile jesu) — po potrebi uskladiti.
5. File length: `DailyLogNewEntryScreen` / `DailyLogEntryPricingBlock` / detail ekrani prelaze ~200 linija — refaktor po potrebi.

---

## Next steps (sljedeća sesija)

1. `cd backend && npx prisma migrate deploy && npx prisma generate` (ako još nije na live)
2. Smoke live:
   - Novi unos: servis + Naplati dug → admin Eye detail: ref, servise, dug, **ukupno**
   - Complete → KIF: kolona Servis lista svih servisa po zapisu
   - Uredi PENDING → forma popunjena (ne prazna)
   - Obriši sa razlogom → dug OPEN
3. Ako treba: uskladiti `workbook-new-entry-page` sa unitPrice/settle matricom

### Urađeno u follow-up sesiji (2026-08-11)
- Admin dnevna knjiga: detail dialog/drawer (Eye) — servisi, dugovi, iznosi
- KIF: multi-servis label u koloni Servis (`items` include + stacked UI)

---

## Test status

| Šta | Rezultat |
|-----|----------|
| `jest src/daily-log` (pricing, amounts, admin, service, …) | **24 passed** (zadnji run) |
| Frontend `tsc` (ranije, nakon TS6133/2451 fix) | clean |
| Prisma generate (unitPrice + publicReferenceCode) | OK |
| E2E / live re-test nakon ref+debts UI | **nije** re-verifikovan u ovoj sesiji nakon zadnjeg deploya |

---

## Ključni fajlovi

- `backend/src/daily-log/daily-log.service.ts` — create/settle/findAll filter/entryInclude
- `backend/src/daily-log/daily-log-admin.service.ts` — softDelete + reopen
- `backend/src/daily-log/daily-log-reversal.service.ts` — `reverseLinkedDebtPayments`
- `backend/src/daily-log/daily-log.reference.ts` — DK kodovi
- `backend/prisma/migrations/20260810120000_*` / `20260810160000_*`
- `frontend/src/features/daily-log/*` — forma, amounts, tabela, **entry-detail-dialog**
- `frontend/src/features/finance/income/*` + `income-book.repository.ts` — KIF multi-servis
- `frontend/src/features/stylist-workbook/*` — list/detail display
- `mobile/src/screens/stylist/DailyLog*.tsx`, `DailyLogEntryPricingBlock.tsx`, `reactNavAdapter.ts`
- Matrices: `client-debts/MATRIX.md`, `daily-log/MATRIX.md` (+ CHANGELOG)
